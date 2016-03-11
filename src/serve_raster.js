'use strict';

var async = require('async'),
    advancedPool = require('advanced-pool'),
    crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    zlib = require('zlib');

var clone = require('clone'),
    express = require('express'),
    mercator = new (require('sphericalmercator'))(),
    mbgl = require('mapbox-gl-native'),
    mbtiles = require('mbtiles'),
    request = require('request'),
    sharp = require('sharp');

var utils = require('./utils');

var FLOAT_PATTERN = '[+-]?(?:\\d+|\\d+\.?\\d+)';
var SCALE_PATTERN = '@[23]x';

var getScale = function(scale) {
  return (scale || '@1x').slice(1, 2) | 0;
};

mbgl.on('message', function(e) {
  if (e.severity == 'WARNING' || e.severity == 'ERROR') {
    console.log('mbgl:', e);
  }
});

module.exports = function(options, repo, params, id) {
  var app = express().disable('x-powered-by');

  var rootPath = options.paths.root;

  var styleFile = params.style;
  var map = {
    renderers: [],
    sources: {}
  };

  var styleJSON;
  var createPool = function(ratio, min, max) {
    var createRenderer = function(ratio, createCallback) {
      var renderer = new mbgl.Map({
        ratio: ratio,
        request: function(req, callback) {
          var protocol = req.url.split(':')[0];
          //console.log('Handling request:', req);
          if (protocol == 'sprites' || protocol == 'fonts') {
            var dir = options.paths[protocol];
            var file = unescape(req.url).substring(protocol.length + 3);
            fs.readFile(path.join(dir, file), function(err, data) {
              callback(err, { data: data });
            });
          } else if (protocol == 'mbtiles') {
            var parts = req.url.split('/');
            var source = map.sources[parts[2]];
            var z = parts[3] | 0,
                x = parts[4] | 0,
                y = parts[5].split('.')[0] | 0;
            source.getTile(z, x, y, function(err, data, headers) {
              if (err) {
                //console.log('MBTiles error, serving empty', err);
                callback(null, { data: new Buffer(0) });
              } else {
                var response = {};

                if (headers['Last-Modified']) {
                  response.modified = new Date(headers['Last-Modified']);
                }
                if (headers['ETag']) {
                  response.etag = headers['ETag'];
                }

                response.data = zlib.unzipSync(data);

                callback(null, response);
              }
            });
          } else if (protocol == 'http' || protocol == 'https') {
            request({
                url: req.url,
                encoding: null,
                gzip: true
            }, function(err, res, body) {
                if (err) {
                  //console.log('HTTP tile error', err);
                  callback(null, { data: new Buffer(0) });
                } else if (res.statusCode == 200) {
                  var response = {};

                  if (res.headers.modified) {
                    response.modified = new Date(res.headers.modified);
                  }
                  if (res.headers.expires) {
                    response.expires = new Date(res.headers.expires);
                  }
                  if (res.headers.etag) {
                    response.etag = res.headers.etag;
                  }

                  response.data = body;

                  callback(null, response);
                } else {
                  //console.log('HTTP error', JSON.parse(body).message);
                  callback(null, { data: new Buffer(0) });
                }
            });
          }
        }
      });
      renderer.load(styleJSON);
      createCallback(null, renderer);
    };
    return new advancedPool.Pool({
      min: min,
      max: max,
      create: createRenderer.bind(null, ratio),
      destroy: function(renderer) {
        renderer.release();
      }
    });
  };

  styleJSON = require(path.join(options.paths.styles, styleFile));
  styleJSON.sprite = 'sprites://' + path.basename(styleFile, '.json');
  styleJSON.glyphs = 'fonts://{fontstack}/{range}.pbf';

  var tileJSON = {
    'tilejson': '2.0.0',
    'name': styleJSON.name,
    'basename': id,
    'minzoom': 0,
    'maxzoom': 20,
    'bounds': [-180, -85.0511, 180, 85.0511],
    'format': 'png',
    'type': 'baselayer'
  };
  Object.assign(tileJSON, params.tilejson || {});
  tileJSON.tiles = params.domains || options.domains;

  var queue = [];
  Object.keys(styleJSON.sources).forEach(function(name) {
    var source = styleJSON.sources[name];
    var url = source.url;
    if (url.lastIndexOf('mbtiles:', 0) === 0) {
      // found mbtiles source, replace with info from local file
      delete source.url;

      queue.push(function(callback) {
        var mbtilesFile = url.substring('mbtiles://'.length);
        map.sources[name] = new mbtiles(
          path.join(options.paths.mbtiles, mbtilesFile), function(err) {
          map.sources[name].getInfo(function(err, info) {
            Object.assign(source, info);
            source.basename = name;
            source.tiles = [
              // meta url which will be detected when requested
              'mbtiles://' + name + '/{z}/{x}/{y}.pbf'
            ];
            callback(null);
          });
        });
      });
    }
  });

  async.parallel(queue, function(err, results) {
    // TODO: make pool sizes configurable
    map.renderers[1] = createPool(1, 4, 16);
    map.renderers[2] = createPool(2, 2, 8);
    map.renderers[3] = createPool(3, 2, 4);
  });

  repo[id] = tileJSON;

  var tilePattern = '/raster/' + id + '/:z(\\d+)/:x(\\d+)/:y(\\d+)' +
                    ':scale(' + SCALE_PATTERN + ')?\.:format([\\w]+)';

  var respondImage = function(z, lon, lat, bearing, pitch,
                              width, height, scale, format, res, next) {
    if (Math.abs(lon) > 180 || Math.abs(lat) > 85.06) {
      return res.status(400).send('Invalid center');
    }
    if (Math.min(width, height) <= 0 ||
        Math.max(width, height) * scale > 6000) {
      return res.status(400).send('Invalid size');
    }
    if (format == 'png' || format == 'webp') {
    } else if (format == 'jpg' || format == 'jpeg') {
      format = 'jpeg';
    } else {
      return res.status(400).send('Invalid format');
    }

    var pool = map.renderers[scale];
    pool.acquire(function(err, renderer) {
      var mbglZ = Math.max(0, z - 1);
      var params = {
        zoom: mbglZ,
        center: [lon, lat],
        bearing: bearing,
        pitch: pitch,
        width: width,
        height: height
      };
      if (z == 0) {
        params.width *= 2;
        params.height *= 2;
      }
      renderer.render(params, function(err, data) {
        pool.release(renderer);
        if (err) console.log(err);

        var image = sharp(data, {
          raw: {
            width: params.width * scale,
            height: params.height * scale,
            channels: 4
          }
        });

        if (z == 0) {
          // HACK: when serving zoom 0, resize the 0 tile from 512 to 256
          image.resize(width * scale, height * scale);
        }

        image.toFormat(format);

        var formatEncoding = (params.formatEncoding || {})[format] ||
                             (options.formatEncoding || {})[format];
        if (format == 'png') {
          image.compressionLevel(formatEncoding || 6)
               .withoutAdaptiveFiltering();
        } else if (format == 'jpeg') {
          image.quality(formatEncoding || 80);
        } else if (format == 'webp') {
          image.quality(formatEncoding || 90);
        }
        image.toBuffer(function(err, buffer, info) {
          if (!buffer) {
            return res.status(404).send('Not found');
          }

          var md5 = crypto.createHash('md5').update(buffer).digest('base64');
          res.set({
            'content-md5': md5,
            'content-type': 'image/' + format
          });
          return res.status(200).send(buffer);
        });
      });
    });
  };

  app.get(tilePattern, function(req, res, next) {
    var z = req.params.z | 0,
        x = req.params.x | 0,
        y = req.params.y | 0,
        scale = getScale(req.params.scale),
        format = req.params.format;
    if (z < 0 || x < 0 || y < 0 ||
        z > 20 || x >= Math.pow(2, z) || y >= Math.pow(2, z)) {
      return res.status(404).send('Out of bounds');
    }
    var tileSize = 256;
    var tileCenter = mercator.ll([
      ((x + 0.5) / (1 << z)) * (256 << z),
      ((y + 0.5) / (1 << z)) * (256 << z)
    ], z);
    return respondImage(z, tileCenter[0], tileCenter[1], 0, 0,
                        tileSize, tileSize, scale, format, res, next);
  });

  var staticPattern =
      '/static/' + id + '/%s:scale(' + SCALE_PATTERN + ')?\.:format([\\w]+)';

  var centerPattern =
      util.format(':lon(%s),:lat(%s),:z(\\d+):bearing(,%s)?:pitch(,%s)?/' +
                  ':width(\\d+)x:height(\\d+)',
                  FLOAT_PATTERN, FLOAT_PATTERN, FLOAT_PATTERN, FLOAT_PATTERN);

  app.get(util.format(staticPattern, centerPattern), function(req, res, next) {
    var z = req.params.z | 0,
        x = +req.params.lon,
        y = +req.params.lat,
        bearing = +(req.params.bearing || ',0').substring(1),
        pitch = +(req.params.pitch || ',0').substring(1),
        w = req.params.width | 0,
        h = req.params.height | 0,
        scale = getScale(req.params.scale),
        format = req.params.format;
    return respondImage(z, x, y, bearing, pitch,
                        w, h, scale, format, res, next);
  });

  var boundsPattern =
      util.format(':minx(%s),:miny(%s),:maxx(%s),:maxy(%s)/:z(\\d+)',
                  FLOAT_PATTERN, FLOAT_PATTERN, FLOAT_PATTERN, FLOAT_PATTERN);

  app.get(util.format(staticPattern, boundsPattern), function(req, res, next) {
    var bbox = [+req.params.minx, +req.params.miny,
                +req.params.maxx, +req.params.maxy];
    var z = req.params.z | 0,
        x = (bbox[0] + bbox[2]) / 2,
        y = (bbox[1] + bbox[3]) / 2;
    var minCorner = mercator.px([bbox[0], bbox[3]], z),
        maxCorner = mercator.px([bbox[2], bbox[1]], z);
    var w = (maxCorner[0] - minCorner[0]) | 0,
        h = (maxCorner[1] - minCorner[1]) | 0,
        scale = getScale(req.params.scale),
        format = req.params.format;
    return respondImage(z, x, y, 0, 0, w, h, scale, format, res, next);
  });

  app.get('/raster/' + id + '.json', function(req, res, next) {
    var info = clone(tileJSON);
    info.tiles = utils.getTileUrls(req, info.tiles,
                                   'raster/' + id, info.format);
    return res.send(info);
  });

  return app;
};

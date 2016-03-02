'use strict';

var async = require('async'),
    asyncLock = require('async-lock'),
    crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    zlib = require('zlib');

var abaculus = require('abaculus'),
    clone = require('clone'),
    concat = require('concat-stream'),
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

module.exports = function(maps, options, prefix) {
  var lock = new asyncLock();

  var app = express().disable('x-powered-by'),
      domains = [],
      tilePath = '/{z}/{x}/{y}.{format}';

  if (options.domains && options.domains.length > 0) {
    domains = options.domains.split(',');
  }

  var rootPath = path.join(process.cwd(), options.root);

  var styleUrl = options.style;
  var map = {
    renderers: [],
    sources: {},
    tileJSON: {}
  };
  if (!maps[prefix]) {
    var createRenderer = function(ratio) {
      return new mbgl.Map({
        ratio: ratio,
        request: function(req, callback) {
          var protocol = req.url.split(':')[0];
          //console.log('Handling request:', req);
          if (protocol == req.url) {
            fs.readFile(path.join(rootPath, unescape(req.url)), function(err, data) {
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
                //console.log('MBTiles error, serving empty');
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
                    callback(err);
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
                    callback(new Error(JSON.parse(body).message));
                }
            });
          }
        }
      });
    };
    map.renderers[1] = createRenderer(1);
    map.renderers[2] = createRenderer(2);
    map.renderers[3] = createRenderer(3);

    var styleJSON = require(path.join(rootPath, styleUrl));

    map.tileJSON = {
      'tilejson': '2.0.0',
      'name': styleJSON.name,
      'basename': prefix.substr(1),
      'minzoom': 0,
      'maxzoom': 20,
      'bounds': [-180, -85.0511, 180, 85.0511],
      'format': 'png',
      'type': 'baselayer'
    };
    Object.assign(map.tileJSON, options.options || {});

    var queue = [];
    Object.keys(styleJSON.sources).forEach(function(name) {
      var source = styleJSON.sources[name];
      var url = source.url;
      if (url.lastIndexOf('mbtiles:', 0) === 0) {
        // found mbtiles source, replace with info from local file
        delete source.url;

        queue.push(function(callback) {
          var mbtilesUrl = url.substring('mbtiles://'.length);
          map.sources[name] = new mbtiles(path.join(rootPath, mbtilesUrl), function(err) {
            map.sources[name].getInfo(function(err, info) {
              Object.assign(source, info);
              source.basename = name;
              source.tiles = [
                // meta url which will be detected when requested
                'mbtiles://' + name + tilePath.replace('{format}', 'pbf')
              ];
              callback(null);
            });
          });
        });
      }
    });

    async.parallel(queue, function(err, results) {
      map.renderers.forEach(function(renderer) {
        renderer.load(styleJSON);
      });
    });

    maps[prefix] = map;
  } else {
    map = maps[prefix];
  }

  var tilePattern = tilePath
    .replace(/\.(?!.*\.)/, ':scale(' + SCALE_PATTERN + ')?.')
    .replace(/\./g, '\.')
    .replace('{z}', ':z(\\d+)')
    .replace('{x}', ':x(\\d+)')
    .replace('{y}', ':y(\\d+)')
    .replace('{format}', ':format([\\w\\.]+)');

  var getTile = function(z, x, y, scale, format, callback) {
    if (format == 'png' || format == 'webp') {
    } else if (format == 'jpg' || format == 'jpeg') {
      format = 'jpeg';
    } else {
      return callback(null, null);
    }

    var mbglZ = Math.max(0, z - 1);

    var tileSize = 256;
    var tileCenter = mercator.ll([
      ((x + 0.5) / (1 << z)) * (256 << z),
      ((y + 0.5) / (1 << z)) * (256 << z)
    ], z);

    var renderer = map.renderers[scale];

    var params = {
      /*
      debug: {
        tileBorders: true,
        parseStatus: true,
        timestamps: true,
        collision: true
      },
      */
      zoom: mbglZ,
      center: tileCenter,
      width: tileSize,
      height: tileSize
    };
    if (z == 0) {
      params.width *= 2;
      params.height *= 2;
    }
    lock.acquire(renderer, function(done) {
      renderer.render(params, function(err, data) {
        done();
        if (err) console.log(err);

        if (z == 0) {
          // HACK: when serving zoom 0, resize the 0 tile from 512 to 256
          var data_ = clone(data);
          var dataSize_ = 2 * tileSize * scale;
          var newSize_ = dataSize_ / 2;
          data = new Buffer(4 * newSize_ * newSize_);
          for (var x = 0; x < newSize_; x++) {
            for (var y = 0; y < newSize_; y++) {
              for (var b = 0; b < 4; b++) {
                data[4 * (x * newSize_ + y) + b] = (
                    data_[4 * (2 * x * dataSize_ + 2 * y) + b] +
                    data_[4 * (2 * x * dataSize_ + (2 * y + 1)) + b] +
                    data_[4 * ((2 * x + 1) * dataSize_ + 2 * y) + b] +
                    data_[4 * ((2 * x + 1) * dataSize_ + (2 * y + 1)) + b]
                  ) / 4;
              }
            }
          }
        }

        sharp(data, {
          raw: {
            width: tileSize * scale,
            height: tileSize * scale,
            channels: 4
          }
        }).toFormat(format)
          .compressionLevel(9)
          .toBuffer(function(err, buffer, info) {
          if (!buffer) {
            return callback(null, null);
          }

          var md5 = crypto.createHash('md5').update(buffer).digest('base64');
          var headers = {
            'content-md5': md5,
            'content-type': 'image/' + format
          };
          /*
          if (format === 'pbf') {
            headers['content-type'] = 'application/x-protobuf';
            headers['content-encoding'] = 'gzip';
          }
          */
          return callback(null, buffer, headers);
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
    return getTile(z, x, y, scale, format, function(err, data, headers) {
        if (err) {
          return next(err);
        }
        if (headers) {
          res.set(headers);
        }
        if (data == null) {
          return res.status(404).send('Not found');
        } else {
          return res.status(200).send(data);
        }
    }, res, next);
  });

  var processStaticMap = function(areaParams, req, res, next) {
    var scale = getScale(req.params.scale),
        format = req.params.format,
        params = {
          zoom: req.params.z | 0,
          scale: scale,
          bbox: areaParams.bbox,
          center: areaParams.center,
          format: format,
          getTile: function(z, x, y, callback) {
            return getTile(z, x, y, scale, format, function(err, data, headers) {
              if (!err && data == null) {
                err = new Error('Not found');
                err.status = 404;
              }
              callback(err, data, headers);
            });
          }
        };
    return abaculus(params, function(err, data, headers) {
      if (err && !err.status) {
        return next(err);
      }
      res.set(headers);
      res.status((err && err.status) || 200);
      return res.send((err && err.message) || data);
    });
  };

  var staticPattern =
      '/static/%s:scale(' + SCALE_PATTERN + ')?\.:format([\\w\\.]+)';

  var centerPattern =
      util.format(':lon(%s),:lat(%s),:z(\\d+)/:width(\\d+)x:height(\\d+)',
                  FLOAT_PATTERN, FLOAT_PATTERN);

  app.get(util.format(staticPattern, centerPattern), function(req, res, next) {
    return processStaticMap({
      center: {
        x: +req.params.lon,
        y: +req.params.lat,
        w: req.params.width | 0,
        h: req.params.height | 0
      }
    }, req, res, next);
  });

  var boundsPattern =
      util.format(':minx(%s),:miny(%s),:maxx(%s),:maxy(%s)/:z(\\d+)',
                  FLOAT_PATTERN, FLOAT_PATTERN, FLOAT_PATTERN, FLOAT_PATTERN);

  app.get(util.format(staticPattern, boundsPattern), function(req, res, next) {
    return processStaticMap({
      bbox: [
        +req.params.minx,
        +req.params.miny,
        +req.params.maxx,
        +req.params.maxy
      ]
    }, req, res, next);
  });

  app.get('/index.json', function(req, res, next) {
    var info = clone(map.tileJSON);

    info.tiles = utils.getTileUrls(req.protocol, domains, req.headers.host,
                                   prefix, tilePath, info.format,
                                   req.query.key);

    return res.send(info);
  });

  return app;
};

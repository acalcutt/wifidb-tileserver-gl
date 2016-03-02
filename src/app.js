'use strict';

var async = require('async'),
    asyncLock = require('async-lock'),
    crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    stream = require('stream'),
    url = require('url'),
    util = require('util'),
    zlib = require('zlib');

var abaculus = require('abaculus'),
    clone = require('clone'),
    concat = require('concat-stream'),
    debug = require('debug'),
    express = require('express'),
    mercator = new (require('sphericalmercator'))(),
    mbgl = require('mapbox-gl-native'),
    mbtiles = require('mbtiles'),
    PNG = require('pngjs').PNG,
    request = require('request');

debug = debug('tileserver-gl');

var FLOAT_PATTERN = '[+-]?(?:\\d+|\\d+\.?\\d+)';
var SCALE_PATTERN = '@[23]x';

var getScale = function(scale) {
  return (scale || '@1x').slice(1, 2) | 0;
};

var getTileUrls = function(domains, host, path, tilePath, format, key, protocol) {
  domains = domains && domains.length > 0 ? domains : [host];
  var query = (key && key.length > 0) ? ('?key=' + key) : '';
  if (path == '/') {
    path = '';
  }

  var uris = [];
  domains.forEach(function(domain) {
    uris.push(protocol + '://' + domain + path +
              tilePath.replace('{format}', format).replace(/\/+/g, '/') +
              query);
  });

  return uris;
};

var md5sum = function(data) {
  var hash = crypto.createHash('md5');
  hash.update(data);
  return hash.digest();
};

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
    renderer: null,
    sources: {},
    styleJSON: {}
  };
  if (!maps[prefix]) {
    map.renderer = new mbgl.Map({
      ratio: 0.5,
      request: function(req, callback) {
        var protocol = req.url.split(':')[0];
        console.log('Handling request:', req);
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
              console.log('MBTiles error, serving empty');
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

    map.styleJSON = require(path.join(rootPath, styleUrl));

    var queue = [];
    Object.keys(map.styleJSON.sources).forEach(function(name) {
      var source = map.styleJSON.sources[name];
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
                'mbtiles://' + name + tilePath.replace('{format}', 'pbf')
              ];
              callback(null);
            });
          });
        });
      }
    });

    async.parallel(queue, function(err, results) {
      map.renderer.load(map.styleJSON);
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

    var tileCenter = mercator.ll([
      ((x + 0.5) / (1 << z)) * (256 << z),
      ((y + 0.5) / (1 << z)) * (256 << z)
    ], z);

    var tileSize = 256 * scale;

    lock.acquire(map.renderer, function(done) {
      map.renderer.render({
        zoom: z,
        center: tileCenter,
        width: 2 * tileSize,
        height: 2 * tileSize,
        ratio: scale,
        debug: {
          tileBorders: true,
          parseStatus: true,
          timestamps: true,
          collision: true
        }
      }, function(err, data) {
        done();
        if (err) console.log(err);

        var png = new PNG({
          width: tileSize,
          height: tileSize
        });
        png.data = data;

        var concatStream = concat(function(buffer) {
          if (!buffer) {
            return callback(null, null);
          }

          var headers = {
            'content-md5': md5sum(buffer).toString('base64'),
            'content-type': 'image/png'
          };
          /*
          if (format === 'pbf') {
            headers['content-type'] = 'application/x-protobuf';
            headers['content-encoding'] = 'gzip';
          }
          */
          return callback(null, buffer, headers);
        });
        png.pack().pipe(concatStream);
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
    var info = clone(map.styleJSON);

    if (prefix.length > 1) {
      info.basename = prefix.substr(1);
    }

    info.tiles = getTileUrls(domains, req.headers.host, prefix,
                             tilePath, 'png',
                             req.query.key, req.protocol);
    info.tilejson = '2.0.0';

    return res.send(info);
  });

  return app;
};

module.exports.getTileUrls = getTileUrls;

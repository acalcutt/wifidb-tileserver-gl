'use strict';

var crypto = require('crypto'),
    path = require('path');

var clone = require('clone'),
    express = require('express'),
    mbtiles = require('mbtiles');

var utils = require('./utils');

module.exports = function(repo, options, id) {
  var app = express().disable('x-powered-by');

  var rootPath = path.join(process.cwd(), options.root || '');

  var mbtilesPath = options.mbtiles;
  var tileJSON = {
    'tiles': options.domains
  };

  repo[id] = tileJSON;

  var source = new mbtiles(path.join(rootPath, mbtilesPath), function(err) {
    source.getInfo(function(err, info) {
      tileJSON['name'] = id;

      Object.assign(tileJSON, info);

      tileJSON['tilejson'] = '2.0.0';
      tileJSON['basename'] = id;
      tileJSON['format'] = 'pbf';

      Object.assign(tileJSON, options.tilejson || {});
    });
  });

  var tilePattern = '/vector/' + id + '/:z(\\d+)/:x(\\d+)/:y(\\d+).pbf';

  app.get(tilePattern, function(req, res, next) {
    var z = req.params.z | 0,
        x = req.params.x | 0,
        y = req.params.y | 0;
    if (z < tileJSON.minzoom || 0 || x < 0 || y < 0 ||
        z > tileJSON.maxzoom ||
        x >= Math.pow(2, z) || y >= Math.pow(2, z)) {
      return res.status(404).send('Out of bounds');
    }
    source.getTile(z, x, y, function(err, data, headers) {
      if (err) {
        if (/does not exist/.test(err.message)) {
          return res.status(404).send(err.message);
        } else {
          return res.status(500).send(err.message);
        }
      } else {
        var md5 = crypto.createHash('md5').update(data).digest('base64');
        headers['content-md5'] = md5;
        headers['content-type'] = 'application/x-protobuf';
        headers['content-encoding'] = 'gzip';
        res.set(headers);

        if (data == null) {
          return res.status(404).send('Not found');
        } else {
          return res.status(200).send(data);
        }
      }
    });
  });

  app.get('/vector/' + id + '.json', function(req, res, next) {
    var info = clone(tileJSON);
    info.tiles = utils.getTileUrls(req, info.tiles,
                                   'vector/' + id, info.format);
    return res.send(info);
  });

  return app;
};

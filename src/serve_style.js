'use strict';

var path = require('path'),
    fs = require('fs');

var clone = require('clone'),
    express = require('express');


module.exports = function(repo, options, id, reportVector) {
  var app = express().disable('x-powered-by');

  var rootPath = path.join(process.cwd(), options.root || '');

  var styleUrl = path.join(rootPath, options.style);

  var styleJSON = clone(require(styleUrl));
  Object.keys(styleJSON.sources).forEach(function(name) {
    var source = styleJSON.sources[name];
    var url = source.url;
    if (url.lastIndexOf('mbtiles:', 0) === 0) {
      var mbtiles = url.substring('mbtiles://'.length);
      var identifier = reportVector(mbtiles);
      source.url = 'local://vector/' + identifier + '.json';
    }
  });

  var spritePath = path.join(rootPath, styleJSON.sprite);

  styleJSON.sprite = 'local://styles/' + id + '/sprite';
  styleJSON.glyphs = 'local://fonts/{fontstack}/{range}.pbf';

  repo[id] = styleJSON;

  app.get('/styles/' + id + '.json', function(req, res, next) {
    var fixUrl = function(url) {
      return url.replace(
          'local://', req.protocol + '://' + req.headers.host + '/');
    };

    var styleJSON_ = clone(styleJSON);
    Object.keys(styleJSON_.sources).forEach(function(name) {
      var source = styleJSON_.sources[name];
      source.url = fixUrl(source.url);
    });
    styleJSON_.sprite = fixUrl(styleJSON_.sprite);
    styleJSON_.glyphs = fixUrl(styleJSON_.glyphs);
    return res.send(styleJSON_);
  });

  app.get('/styles/' + id + '/sprite:scale(@[23]x)?\.:format([\\w]+)',
      function(req, res, next) {
    var scale = req.params.scale,
        format = req.params.format;
    var filename = spritePath + (scale || '') + '.' + format;
    return fs.readFile(filename, function(err, data) {
      if (err) {
        console.log('Sprite load error:', filename);
        return res.status(404).send('File not found');
      } else {
        if (format == 'json') res.header('Content-type', 'application/json');
        if (format == 'png') res.header('Content-type', 'image/png');
        return res.send(data);
      }
    });
  });

  return app;
};

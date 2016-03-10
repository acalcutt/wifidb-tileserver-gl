'use strict';

var path = require('path');

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
  styleJSON.sprite = 'local://styles/{style_id}/sprite';
  styleJSON.glyphs = 'local://fonts/{fonstack}/{range}.pbf';

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

  return app;
};

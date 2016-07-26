'use strict';

var clone = require('clone'),
    express = require('express');

var utils = require('./utils');

module.exports = function(options, allowedFonts) {
  var app = express().disable('x-powered-by');

  var lastModified = new Date().toUTCString();

  var fontPath = options.paths.fonts;

  app.get('/:fontstack/:range([\\d]+-[\\d]+).pbf',
      function(req, res, next) {
    var fontstack = decodeURI(req.params.fontstack);
    var range = req.params.range;

    return utils.getFontsPbf(allowedFonts, fontPath, fontstack, range,
        function(err, concated) {
      if (err || concated.length === 0) {
        return res.status(400).send('');
      } else {
        res.header('Content-type', 'application/x-protobuf');
        res.header('Last-Modified', lastModified);
        return res.send(concated);
      }
    });
  });

  return app;
};

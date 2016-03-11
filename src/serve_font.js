'use strict';

var path = require('path'),
    fs = require('fs');

var clone = require('clone'),
    express = require('express');


module.exports = function(fontPath, allowedFonts) {
  var app = express().disable('x-powered-by');

  var rootPath = path.join(process.cwd(), fontPath || '');

  app.get('/fonts/:fontstack/:range([\\d]+-[\\d]+).pbf',
      function(req, res, next) {
    var fontstack = decodeURI(req.params.fontstack);
    var range = req.params.range;

    var fonts = fontstack.split(',');
    if (fonts.length == 1) {
      if (allowedFonts[fonts[0]]) {
        var filename = rootPath + '/' + fonts[0] + '/' + range + '.pbf';
        return fs.readFile(filename, function(err, data) {
          if (err) {
            console.log('Font load error:', filename);
            return res.status(404).send('File not found');
          } else {
            res.header('Content-type', 'application/x-protobuf');
            return res.send(data);
          }
        });
      } else {
        return res.status(403).send('Forbidden');
      }
    } else {
      return res.status(501).send('Not Yet Implemented');
    }
  });

  return app;
};

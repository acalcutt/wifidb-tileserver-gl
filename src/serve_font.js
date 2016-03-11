'use strict';

var async = require('async'),
    path = require('path'),
    fs = require('fs');

var clone = require('clone'),
    express = require('express');


module.exports = function(fontPath, allowedFonts) {
  var app = express().disable('x-powered-by');

  var rootPath = path.join(process.cwd(), fontPath || '');

  var getFontPbf = function(name, range, callback) {
    // if some of the files failed to load (does not exist or not allowed),
    // return empty buffer so the other fonts can still work
    if (allowedFonts[name]) {
      var filename = rootPath + '/' + name + '/' + range + '.pbf';
      return fs.readFile(filename, function(err, data) {
        if (err) {
          console.log('Font load error:', filename);
          return callback(null, new Buffer([]));
        } else {
          return callback(null, data);
        }
      });
    } else {
      return callback(null, new Buffer([]));
    }
  };

  app.get('/fonts/:fontstack/:range([\\d]+-[\\d]+).pbf',
      function(req, res, next) {
    var fontstack = decodeURI(req.params.fontstack);
    var range = req.params.range;

    var fonts = fontstack.split(',');

    var queue = [];
    fonts.forEach(function(font) {
      queue.push(function(callback) {
        getFontPbf(font, range, callback);
      });
    });

    return async.parallel(queue, function(err, results) {
      var concated = Buffer.concat(results);
      if (err || concated.length == 0) {
        return res.status(400).send('');
      } else {
        res.header('Content-type', 'application/x-protobuf');
        return res.send(concated);
      }
    });
  });

  return app;
};

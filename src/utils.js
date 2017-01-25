'use strict';

var async = require('async'),
    path = require('path'),
    fs = require('fs');

var clone = require('clone'),
    glyphCompose = require('glyph-pbf-composite');

module.exports.getTileUrls = function(req, domains, path, format, aliases) {

  if (domains) {
    if (domains.constructor === String && domains.length > 0) {
      domains = domains.split(',');
    }
  }
  if (!domains || domains.length == 0) {
    domains = [req.headers.host];
  }

  var key = req.query.key;
  var queryParams = [];
  if (req.query.key) {
    queryParams.push('key=' + req.query.key);
  }
  if (req.query.style) {
    queryParams.push('style=' + req.query.style);
  }
  var query = queryParams.length > 0 ? ('?' + queryParams.join('&')) : '';

  if (aliases && aliases[format]) {
    format = aliases[format];
  }

  var uris = [];
  domains.forEach(function(domain) {
    uris.push(req.protocol + '://' + domain + '/' + path +
              '/{z}/{x}/{y}.' + format + query);
  });

  return uris;
};

module.exports.fixTileJSONCenter = function(tileJSON) {
  if (tileJSON.bounds && !tileJSON.center) {
    var fitWidth = 1024;
    var tiles = fitWidth / 256;
    tileJSON.center = [
      (tileJSON.bounds[0] + tileJSON.bounds[2]) / 2,
      (tileJSON.bounds[1] + tileJSON.bounds[3]) / 2,
      Math.round(
        -Math.log((tileJSON.bounds[2] - tileJSON.bounds[0]) / 360 / tiles) /
        Math.LN2
      )
    ];
  }
};

module.exports.getFontsPbf = function(allowedFonts, fontPath, names, range, fallbacks, callback) {
  var getFontPbf = function(allowedFonts, name, range, callback, fallbacks) {
    if (!allowedFonts || (allowedFonts[name] && fallbacks)) {
      var filename = path.join(fontPath, name, range + '.pbf');
      if (!fallbacks) {
        fallbacks = clone(allowedFonts || {});
      }
      delete fallbacks[name];
      return fs.readFile(filename, function(err, data) {
        if (err) {
          console.error('ERROR: Font not found:', name);
          if (fallbacks && Object.keys(fallbacks).length) {
            var fallbackName = Object.keys(fallbacks)[0];
            console.error('ERROR: Trying to use', fallbackName, 'as a fallback');
            delete fallbacks[fallbackName];
            return getFontPbf(null, fallbackName, range, callback, fallbacks);
          } else {
            return callback(new Error('Font load error: ' + name));
          }
        } else {
          return callback(null, data);
        }
      });
    } else {
      return callback(new Error('Font not allowed: ' + name));
    }
  };

  var fonts = names.split(',');
  var queue = [];
  fonts.forEach(function(font) {
    queue.push(function(callback) {
      getFontPbf(allowedFonts, font, range, callback, clone(allowedFonts || fallbacks));
    });
  });

  return async.parallel(queue, function(err, results) {
    if (err) {
      callback(err, new Buffer([]));
    } else {
      callback(err, glyphCompose.combine(results));
    }
  });
};

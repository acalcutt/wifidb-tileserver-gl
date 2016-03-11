#!/usr/bin/env node
'use strict';

process.env.UV_THREADPOOL_SIZE =
    Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var fs = require('fs'),
    path = require('path');

var clone = require('clone'),
    cors = require('cors'),
    express = require('express'),
    morgan = require('morgan');

var serve_font = require('./serve_font'),
    serve_raster = require('./serve_raster'),
    serve_style = require('./serve_style'),
    serve_vector = require('./serve_vector'),
    utils = require('./utils');

module.exports = function(opts, callback) {
  var app = express().disable('x-powered-by'),
      serving = {
        styles: {},
        raster: {},
        vector: {},
        fonts: { // default fonts, always expose these (if they exist)
          'Open Sans Regular': true,
          'Arial Unicode MS Regular': true
        }
      };

  app.enable('trust proxy');

  callback = callback || function() {};

  if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  var configPath = path.resolve(opts.config),
      config = require(configPath);

  var vector = clone(config.vector);

  Object.keys(config.styles || {}).forEach(function(id) {
    var item = config.styles[id];
    if (!item.style || item.style.length == 0) {
      console.log('Missing "style" property for ' + id);
      return;
    }

    if (item.vector !== false) {
      app.use('/', serve_style(serving.styles, item, id,
        function(mbtiles) {
          var vectorItemId;
          Object.keys(vector).forEach(function(id) {
            if (vector[id].mbtiles == mbtiles) {
              vectorItemId = id;
            }
          });
          if (vectorItemId) { // mbtiles exist in the vector config
            return vectorItemId;
          } else {
            var id = mbtiles.substr(0, mbtiles.lastIndexOf('.')) || mbtiles;
            while (vector[id]) id += '_';
            vector[id] = {
              'mbtiles': mbtiles
            };
            return id;
          }
        }, function(font) {
          serving.fonts[font] = true;
        }));
    }
    if (item.raster !== false) {
      app.use('/', serve_raster(serving.raster, item, id));
    }
  });

  app.use('/', serve_font('glyphs', serving.fonts));

  //TODO: cors

  Object.keys(vector).forEach(function(id) {
    var item = vector[id];
    if (!item.mbtiles || item.mbtiles.length == 0) {
      console.log('Missing "mbtiles" property for ' + id);
      return;
    }

    app.use('/', serve_vector(serving.vector, item, id));
  });

  app.get('/styles.json', function(req, res, next) {
    var result = [];
    Object.keys(serving.styles).forEach(function(id) {
      var styleJSON = serving.styles[id];
      result.push({
        version: styleJSON.version,
        name: styleJSON.name,
        id: id,
        url: req.protocol + '://' + req.headers.host + '/styles/' + id + '.json'
      });
    });
    res.send(result);
  });

  var addTileJSONs = function(arr, req, type) {
    Object.keys(serving[type]).forEach(function(id) {
      var info = clone(serving[type][id]);
      info.tiles = utils.getTileUrls(req, info.tiles,
                                     type + '/' + id, info.format);
      arr.push(info);
    });
    return arr;
  };

  app.get('/raster.json', function(req, res, next) {
    res.send(addTileJSONs([], req, 'raster'));
  });
  app.get('/vector.json', function(req, res, next) {
    res.send(addTileJSONs([], req, 'vector'));
  });
  app.get('/index.json', function(req, res, next) {
    res.send(addTileJSONs(addTileJSONs([], req, 'raster'), req, 'vector'));
  });

  // serve viewer on the root
  app.use('/', express.static(path.join(__dirname, '../public')));

  var server = app.listen(process.env.PORT || opts.port, function() {
    console.log('Listening at http://%s:%d/',
                this.address().address, this.address().port);

    return callback();
  });

  setTimeout(callback, 1000);
  return {
    app: app,
    server: server
  };
};

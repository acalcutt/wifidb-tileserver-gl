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

  var configPath = path.resolve(opts.config);

  var config;
  try {
    config = require(configPath);
  } catch (e) {
    console.log('ERROR: Config file not found or invalid!');
    console.log('       See README.md for instructions and sample data.');
    process.exit(1);
  }

  var options = config.options || {};
  var paths = options.paths || {};
  options.paths = paths;
  paths.root = path.join(process.cwd(), paths.root || '');
  paths.styles = path.join(paths.root, paths.styles || '');
  paths.fonts = path.join(paths.root, paths.fonts || '');
  paths.sprites = path.join(paths.root, paths.sprites || '');
  paths.mbtiles = path.join(paths.root, paths.mbtiles || '');

  var vector = clone(config.vector);

  Object.keys(config.styles || {}).forEach(function(id) {
    var item = config.styles[id];
    if (!item.style || item.style.length == 0) {
      console.log('Missing "style" property for ' + id);
      return;
    }

    if (item.vector !== false) {
      app.use('/', serve_style(options, serving.styles, item, id,
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
      app.use('/', serve_raster(options, serving.raster, item, id));
    }
  });

  if (Object.keys(serving.styles).length > 0) {
    // serve fonts only if serving some styles
    app.use('/', serve_font(options, serving.fonts));
  }

  //TODO: cors

  Object.keys(vector).forEach(function(id) {
    var item = vector[id];
    if (!item.mbtiles || item.mbtiles.length == 0) {
      console.log('Missing "mbtiles" property for ' + id);
      return;
    }

    app.use('/', serve_vector(options, serving.vector, item, id));
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

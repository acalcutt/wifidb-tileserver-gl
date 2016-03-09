#!/usr/bin/env node
'use strict';

process.env.UV_THREADPOOL_SIZE =
    Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var fs = require('fs'),
    path = require('path');

var async = require('async'),
    clone = require('clone'),
    cors = require('cors'),
    express = require('express'),
    morgan = require('morgan');

var serve_raster = require('./serve_raster'),
    serve_vector = require('./serve_vector'),
    utils = require('./utils');

module.exports = function(opts, callback) {
  var app = express().disable('x-powered-by'),
      maps = {};

  app.enable('trust proxy');

  callback = callback || function() {};

  if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  var configPath = path.resolve(opts.config),
      config = require(configPath);

  Object.keys(config).forEach(function(prefix) {
    if (config[prefix].cors !== false) {
      app.use(prefix, cors());
    }

    if (config[prefix].style) {
      app.use(prefix, serve_raster(maps, config[prefix], prefix));
    } else {
      app.use(prefix, serve_vector(maps, config[prefix], prefix));
    }
  });

  // serve index.html on the root
  app.use('/', express.static(path.join(__dirname, '../public')));

  app.get(/^(\/[^\/]+)\.json$/, function(req, res, next) {
    var prefix = req.params[0];
    if (prefix == '/index') {
      var queue = [];
      Object.keys(config).forEach(function(mapPrefix) {
        var map = maps[mapPrefix];
        queue.push(function(callback) {
          var info = clone(map.tileJSON);

          info.tiles = utils.getTileUrls(
              req.protocol, config[mapPrefix].domains, req.headers.host,
              mapPrefix, '/{z}/{x}/{y}.{format}', info.format, req.query.key);

          callback(null, info);
        });
      });
      return async.parallel(queue, function(err, results) {
        return res.send(results);
      });
    } else {
      var map = maps[prefix];
      if (!map || !map.tileJSON) {
        return res.status(404).send('Not found');
      }
      var info = clone(map.tileJSON);

      info.tiles = utils.getTileUrls(
          req.protocol, config[prefix].domains, req.headers.host,
          prefix, '/{z}/{x}/{y}.{format}', info.format, req.query.key);

      return res.send(info);
    }
  });

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

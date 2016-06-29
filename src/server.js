#!/usr/bin/env node
'use strict';

process.env.UV_THREADPOOL_SIZE =
    Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var fs = require('fs'),
    path = require('path');

var clone = require('clone'),
    cors = require('cors'),
    express = require('express'),
    handlebars = require('handlebars'),
    mercator = new (require('sphericalmercator'))(),
    morgan = require('morgan');

var serve_font = require('./serve_font'),
    serve_rendered = require('./serve_rendered'),
    serve_style = require('./serve_style'),
    serve_data = require('./serve_data'),
    utils = require('./utils');

module.exports = function(opts, callback) {
  var app = express().disable('x-powered-by'),
      serving = {
        styles: {},
        rendered: {},
        data: {},
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
  paths.root = path.resolve(process.cwd(), paths.root || '');
  paths.styles = path.resolve(paths.root, paths.styles || '');
  paths.fonts = path.resolve(paths.root, paths.fonts || '');
  paths.sprites = path.resolve(paths.root, paths.sprites || '');
  paths.mbtiles = path.resolve(paths.root, paths.mbtiles || '');

  var data = clone(config.data || {});

  app.use(cors());

  Object.keys(config.styles || {}).forEach(function(id) {
    var item = config.styles[id];
    if (!item.style || item.style.length == 0) {
      console.log('Missing "style" property for ' + id);
      return;
    }

    if (item.serve_data !== false) {
      app.use('/styles/', serve_style(options, serving.styles, item, id,
        function(mbtiles) {
          var dataItemId;
          Object.keys(data).forEach(function(id) {
            if (data[id].mbtiles == mbtiles) {
              dataItemId = id;
            }
          });
          if (dataItemId) { // mbtiles exist in the data config
            return dataItemId;
          } else {
            var id = mbtiles.substr(0, mbtiles.lastIndexOf('.')) || mbtiles;
            while (data[id]) id += '_';
            data[id] = {
              'mbtiles': mbtiles
            };
            return id;
          }
        }, function(font) {
          serving.fonts[font] = true;
        }));
    }
    if (item.serve_rendered !== false) {
      app.use('/styles/' + id + '/',
              serve_rendered(options, serving.rendered, item, id));
    }
  });

  if (Object.keys(serving.styles).length > 0) {
    // serve fonts only if serving some styles
    app.use('/fonts/', serve_font(options, serving.fonts));
  }

  Object.keys(data).forEach(function(id) {
    var item = data[id];
    if (!item.mbtiles || item.mbtiles.length == 0) {
      console.log('Missing "mbtiles" property for ' + id);
      return;
    }

    app.use('/data/', serve_data(options, serving.data, item, id));
  });

  app.get('/styles.json', function(req, res, next) {
    var result = [];
    var query = req.query.key ? ('?key=' + req.query.key) : '';
    Object.keys(serving.styles).forEach(function(id) {
      var styleJSON = serving.styles[id];
      result.push({
        version: styleJSON.version,
        name: styleJSON.name,
        id: id,
        url: req.protocol + '://' + req.headers.host +
             '/styles/' + id + '.json' + query
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

  app.get('/rendered.json', function(req, res, next) {
    res.send(addTileJSONs([], req, 'rendered'));
  });
  app.get('/data.json', function(req, res, next) {
    res.send(addTileJSONs([], req, 'data'));
  });
  app.get('/index.json', function(req, res, next) {
    res.send(addTileJSONs(addTileJSONs([], req, 'rendered'), req, 'data'));
  });

  //------------------------------------
  // serve web presentations
  app.use('/', express.static(path.join(__dirname, '../public/resources')));

  var templates = path.join(__dirname, '../public/templates');
  var serveTemplate = function(path, template, dataGetter) {
    fs.readFile(templates + '/' + template + '.tmpl', function(err, content) {
      if (err) {
        console.log('Template not found:', err);
      }
      var compiled = handlebars.compile(content.toString());

      app.use(path, function(req, res, next) {
        var data = {};
        if (dataGetter) {
          data = dataGetter(req);
          if (!data) {
            return res.status(404).send('Not found');
          }
        }
        data['access_key'] = req.query.key;
        data['access_key_query'] = req.query.key ? '?key=' + req.query.key : '';
        return res.status(200).send(compiled(data));
      });
    });
  };

  serveTemplate('/$', 'index', function(req) {
    var styles = clone(config.styles || {});
    Object.keys(styles).forEach(function(id) {
      var style = styles[id];
      style.name = (serving.styles[id] || serving.rendered[id] || {}).name;
      style.serving_data = serving.styles[id];
      style.serving_rendered = serving.rendered[id];
      if (style.serving_rendered) {
        var center = style.serving_rendered.center;
        if (center) {
          style.viewer_hash = '#' + center[2] + '/' +
                              center[1].toFixed(5) + '/' +
                              center[0].toFixed(5);

          var centerPx = mercator.px([center[0], center[1]], center[2]);
          style.thumbnail = center[2] + '/' +
              Math.floor(centerPx[0] / 256) + '/' +
              Math.floor(centerPx[1] / 256) + '.png';
        }

        var query = req.query.key ? ('?key=' + req.query.key) : '';
        style.wmts_link = 'https://wmts.maptiler.com/' +
          new Buffer(req.protocol + '://' + req.headers.host +
            '/styles/' + id + '/rendered.json' + query).toString('base64') +
            '/wmts';
      }
    });
    var data = clone(serving.data || {});
    Object.keys(data).forEach(function(id) {
      var data_ = data[id];
      var center = data_.center;
      if (center) {
        data_.viewer_hash = '#' + center[2] + '/' +
                            center[1].toFixed(5) + '/' +
                            center[0].toFixed(5);
      }
      data_.is_vector = data_.format == 'pbf';
      if (!data_.is_vector) {
        if (center) {
          var centerPx = mercator.px([center[0], center[1]], center[2]);
          data_.thumbnail = center[2] + '/' +
              Math.floor(centerPx[0] / 256) + '/' +
              Math.floor(centerPx[1] / 256) + '.' + data_.format;
        }

        var query = req.query.key ? ('?key=' + req.query.key) : '';
        data_.wmts_link = 'https://wmts.maptiler.com/' +
          new Buffer(req.protocol + '://' + req.headers.host +
            '/data/' + id + '.json' + query).toString('base64') + '/wmts';
      }
      if (data_.filesize) {
        var suffix = 'kB';
        var size = parseInt(data_.filesize, 10) / 1024;
        if (size > 1024) {
          suffix = 'MB';
          size /= 1024;
        }
        if (size > 1024) {
          suffix = 'GB';
          size /= 1024;
        }
        data_.formatted_filesize = size.toFixed(2) + ' ' + suffix;
      }
    });
    return {
      styles: styles,
      data: data
    };
  });

  serveTemplate('/styles/:id/$', 'viewer', function(req) {
    var id = req.params.id;
    var style = clone((config.styles || {})[id]);
    if (!style) {
      return null;
    }
    style.id = id;
    style.name = (serving.styles[id] || serving.rendered[id]).name;
    style.serving_data = serving.styles[id];
    style.serving_rendered = serving.rendered[id];
    return style;
  });

  /*
  app.use('/rendered/:id/$', function(req, res, next) {
    return res.redirect(301, '/styles/' + req.params.id + '/');
  });
  */

  serveTemplate('/data/:id/$', 'data', function(req) {
    var id = req.params.id;
    var data = clone(serving.data[id]);
    if (!data) {
      return null;
    }
    data.id = id;
    data.is_vector = data.format == 'pbf';
    return data;
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

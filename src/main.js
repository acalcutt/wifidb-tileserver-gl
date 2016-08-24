#!/usr/bin/env node

'use strict';

var fs = require('fs'),
    path = require('path'),
    request = require('request');

var mbtiles = require('mbtiles');

var packageJson = require('../package');

var opts = require('nomnom')
  .option('mbtiles', {
    default: undefined,
    help: 'MBTiles file (uses demo configuration);\n' +
          '\t    ignored if the configuration file is also specified',
    position: 0
  })
  .option('config', {
    abbr: 'c',
    default: 'config.json',
    help: 'Configuration file'
  })
  .option('bind', {
    abbr: 'b',
    default: undefined,
    help: 'Bind address'
  })
  .option('port', {
    abbr: 'p',
    default: 8080,
    help: 'Port'
  })
  .option('verbose', {
    abbr: 'V',
    flag: true,
    help: 'More verbose output'
  })
  .option('version', {
    abbr: 'v',
    flag: true,
    help: 'Version info',
    callback: function() {
      return packageJson.name + ' v' + packageJson.version;
    }
  }).parse();


console.log('Starting ' + packageJson.name + ' v' + packageJson.version);

var startServer = function(configPath, config) {
  return require('./server')({
    configPath: configPath,
    config: config,
    bind: opts.bind,
    port: opts.port
  });
};

var startWithMBTiles = function(mbtilesFile) {
  console.log('Automatically creating config file for ' + mbtilesFile);

  mbtilesFile = path.resolve(process.cwd(), mbtilesFile);

  var mbtilesStats = fs.statSync(mbtilesFile);
  if (!mbtilesStats.isFile() || mbtilesStats.size === 0) {
    console.log('ERROR: Not valid MBTiles file: ' + mbtilesFile);
    process.exit(1);
  }
  var instance = new mbtiles(mbtilesFile, function(err) {
    instance.getInfo(function(err, info) {
      if (info.format != 'pbf') {
        console.log('ERROR: MBTiles format is not "pbf".');
        process.exit(1);
      }
      var bounds = info.bounds;

      var styleDir = path.resolve(__dirname, "../node_modules/tileserver-gl-styles/");

      var config = {
        "options": {
          "paths": {
            "root": styleDir,
            "fonts": "glyphs",
            "sprites": "sprites",
            "styles": "styles",
            "mbtiles": path.dirname(mbtilesFile)
          }
        },
        "styles": {},
        "data": {
          "osm2vectortiles": {
            "mbtiles": path.basename(mbtilesFile)
          }
        }
      };

      var styles = fs.readdirSync(path.resolve(styleDir, 'styles'));
      for (var i=0; i < styles.length; i++) {
        var styleFilename = styles[i];
        if (styleFilename.endsWith('.json')) {
          var styleObject = {
            "style": path.basename(styleFilename),
            "tilejson": {
              "bounds": bounds
            }
          };
          config['styles'][path.basename(styleFilename, '.json')] =
              styleObject;
        }
      }

      if (opts.verbose) {
        console.log(JSON.stringify(config, undefined, 2));
      } else {
        console.log('Run with --verbose to see the config file here.');
      }

      return startServer(null, config);
    });
  });
};

fs.stat(path.resolve(opts.config), function(err, stats) {
  if (err || !stats.isFile() || stats.size === 0) {
    var mbtiles = opts.mbtiles;
    if (!mbtiles) {
      // try to find in the cwd
      var files = fs.readdirSync(process.cwd());
      for (var i=0; i < files.length; i++) {
        var filename = files[i];
        if (filename.endsWith('.mbtiles')) {
          var mbTilesStats = fs.statSync(filename);
          if (mbTilesStats.isFile() && mbTilesStats.size > 0) {
            mbtiles = filename;
            break;
          }
        }
      }
      if (mbtiles) {
        console.log('No MBTiles specified, using ' + mbtiles);
        return startWithMBTiles(mbtiles);
      } else {
        var url = 'https://github.com/klokantech/tileserver-gl-styles/releases/download/v0.3.0/zurich_switzerland.mbtiles';
        var filename = 'zurich_switzerland.mbtiles';
        var stream = fs.createWriteStream(filename);
        console.log('Downloading sample data (' + filename + ') from ' + url);
        stream.on('finish', function() {
          return startWithMBTiles(mbtiles);
        });
        return request.get(url).pipe(stream);
      }
    }
    if (mbtiles) {
      return startWithMBTiles(mbtiles);
    }
  } else {
    console.log('Using specified config file from ' + opts.config);
    return startServer(opts.config, null);
  }
});

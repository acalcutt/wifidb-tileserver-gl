#!/usr/bin/env node

'use strict';

var opts = require('nomnom')
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
  .option('version', {
    abbr: 'v',
    flag: true,
    help: 'Version info',
    callback: function() {
      return 'version ' + require('../package.json').version;
    }
  }).parse();

return require('./server')({
  config: opts.config,
  bind: opts.bind,
  port: opts.port
});

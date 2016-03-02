#!/usr/bin/env node

'use strict';

return require('./server')({
  config: 'config.json',
  port: 8080
});

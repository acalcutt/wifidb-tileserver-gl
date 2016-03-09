process.env.NODE_ENV = 'test';

global.should = require('should');
global.supertest = require('supertest');

before(function(done) {
  console.log('global setup');
  process.chdir('test_data');
  var running = require('../src/server')({
    config: 'config.json',
    port: 8888
  }, done);
  global.app = running.app;
  global.server = running.server;
});

after(function() {
  console.log('global teardown');
  global.server.close(function() { console.log('Done'); });
});

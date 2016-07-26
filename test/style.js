var testIs = function(url, type, status) {
  it(url + ' return ' + (status || 200) + ' and is ' + type.toString(),
      function(done) {
    supertest(app)
      .get(url)
      .expect(status || 200)
      .expect('Content-Type', type, done);
  });
};

describe('Styles', function() {
  describe('/styles/test.json is valid style', function() {
    testIs('/styles/test.json', /application\/json/);

    it('contains expected properties', function(done) {
      supertest(app)
        .get('/styles/test.json')
        .expect(function(res) {
          res.body.version.should.equal(8);
          res.body.name.should.be.String();
          res.body.sources.should.be.Object();
          res.body.glyphs.should.be.String();
          res.body.sprite.should.be.String();
          res.body.layers.should.be.Array();
        }).end(done);
    });
  });
  describe('/styles/streets.json is not served', function() {
    testIs('/styles/streets.json', /./, 404);
  });

  describe('/styles/test/sprite[@2x].{format}', function() {
    testIs('/styles/test/sprite.json', /application\/json/);
    testIs('/styles/test/sprite@2x.json', /application\/json/);
    testIs('/styles/test/sprite.png', /image\/png/);
    testIs('/styles/test/sprite@2x.png', /image\/png/);
  });
});

describe('Fonts', function() {
  testIs('/fonts/Open Sans Bold/0-255.pbf', /application\/x-protobuf/);
  testIs('/fonts/Open Sans Regular/65280-65533.pbf', /application\/x-protobuf/);
  testIs('/fonts/Open Sans Bold,Open Sans Regular/0-255.pbf',
         /application\/x-protobuf/);
  testIs('/fonts/Nonsense,Open Sans Bold/0-255.pbf', /./, 400);

  testIs('/fonts/Nonsense/0-255.pbf', /./, 400);
  testIs('/fonts/Nonsense1,Nonsense2/0-255.pbf', /./, 400);
});

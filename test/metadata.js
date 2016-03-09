describe('Metadata', function() {
  describe('/index.json', function() {
    it('is json', function(done) {
      supertest(app)
        .get('/index.json')
        .expect(200)
        .expect('Content-Type', /application\/json/, done);
    });

    it('is non-empty array', function(done) {
      supertest(app)
        .get('/index.json')
        .expect(function(res) {
          res.body.should.be.Array();
          res.body.length.should.be.greaterThan(0);
        }).end(done);
    });
  });

  describe('/test.json', function() {
    it('is json', function(done) {
      supertest(app)
        .get('/test.json')
        .expect(200)
        .expect('Content-Type', /application\/json/, done);
    });

    it('has valid basename and tiles', function(done) {
      supertest(app)
        .get('/test.json')
        .expect(function(res) {
          res.body.basename.should.equal('test');
          res.body.tiles.length.should.be.greaterThan(0);
        }).end(done);
    });
  });
});

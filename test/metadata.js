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
});

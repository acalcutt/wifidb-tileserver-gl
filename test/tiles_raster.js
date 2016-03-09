var testTile = function(prefix, z, x, y, format, status, type) {
  var path = '/' + prefix + '/' + z + '/' + x + '/' + y + '.' + format;
  it(path + ' returns ' + status, function(done) {
    var test = supertest(app).get(path);
    if (status) test.expect(status);
    if (type) test.expect('Content-Type', type);
    test.end(done);
  });
};

describe('Raster tiles', function() {
  describe('existing tiles', function() {
    testTile('test', 0, 0, 0, 'png', 200, /image\/png/);
    testTile('test', 0, 0, 0, 'jpg',  200, /image\/jpeg/);
    testTile('test', 0, 0, 0, 'jpeg',  200, /image\/jpeg/);
    testTile('test', 0, 0, 0, 'webp',  200, /image\/webp/);

    testTile('test', 1, 1, 1, 'png', 200);
  });

  describe('error tiles', function() {
    testTile('non_existent', 0, 0, 0, 'png', 404);
    testTile('test', -1, 0, 0, 'png', 404);
    testTile('test', 0, 1, 0, 'png', 404);
    testTile('test', 0, 0, 1, 'png', 404);
    testTile('test', 0, 0, 1, 'gif', 404);
  });
});

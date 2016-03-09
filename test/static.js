var testStatic = function(prefix, q, format, status, scale, type) {
  if (scale) q += '@' + scale + 'x';
  var path = '/' + prefix + '/static/' + q + '.' + format;
  it(path + ' returns ' + status, function(done) {
    var test = supertest(app).get(path);
    if (status) test.expect(status);
    if (type) test.expect('Content-Type', type);
    test.end(done);
  });
};

describe('Static endpoints', function() {
  describe('center-based', function() {
    describe('Valid requests', function() {
      testStatic('test', '0,0,0/256x256', 'png', 200, undefined, /image\/png/);
      testStatic('test', '0,0,0/256x256', 'jpg', 200, undefined, /image\/jpeg/);
      testStatic('test', '0,0,0/256x256', 'jpeg', 200, undefined, /image\/jpeg/);
      testStatic('test', '0,0,0/256x256', 'webp', 200, undefined, /image\/webp/);

      testStatic('test', '0,0,0/300x300', 'png', 200, 2);
      testStatic('test', '0,0,0/300x300', 'png', 200, 3);

      testStatic('test', '80,40,20/600x300', 'png', 200, 3);
      testStatic('test', '8.5,40.5,20/300x150', 'png', 200, 3);
      testStatic('test', '-8.5,-40.5,20/300x150', 'png', 200, 3);
    });

    describe('Invalid requests', function() {
      testStatic('test', '190,0,0/256x256', 'png', 400);
      testStatic('test', '0,86,0/256x256', 'png', 400);
      testStatic('test', '80,40,20/0x0', 'png', 400);
      testStatic('test', '0,0,0/256x256', 'gif', 400);
      testStatic('test', '0,0,0/256x256', 'png', 404, 1);

      testStatic('test', '0,0,-1/256x256', 'png', 404);
      testStatic('test', '0,0,1.5/256x256', 'png', 404);
      testStatic('test', '0,0,0/256.5x256.5', 'png', 404);
    });
  });
});

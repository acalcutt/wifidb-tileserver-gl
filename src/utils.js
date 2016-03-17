'use strict';

module.exports.getTileUrls = function(req, domains, path, format) {

  if (domains) {
    if (domains.constructor === String && domains.length > 0) {
      domains = domains.split(',');
    }
  }
  if (!domains || domains.length == 0) {
    domains = [req.headers.host];
  }

  var key = req.query.key;
  var query = (key && key.length > 0) ? ('?key=' + key) : '';

  var uris = [];
  domains.forEach(function(domain) {
    uris.push(req.protocol + '://' + domain + '/' + path +
              '/{z}/{x}/{y}.' + format + query);
  });

  return uris;
};

module.exports.fixTileJSONCenter = function(tileJSON) {
  if (tileJSON.bounds && !tileJSON.center) {
    var fitWidth = 1024;
    var tiles = fitWidth / 256;
    tileJSON.center = [
      (tileJSON.bounds[0] + tileJSON.bounds[2]) / 2,
      (tileJSON.bounds[1] + tileJSON.bounds[3]) / 2,
      Math.round(
        -Math.log((tileJSON.bounds[2] - tileJSON.bounds[0]) / 360 / tiles) /
        Math.LN2
      )
    ];
  }
};

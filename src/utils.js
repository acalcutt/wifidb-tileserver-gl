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

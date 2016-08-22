==========
Deployment
==========

Typically - you should use nginx/lighttpd/apache on the frontend - and the tileserver-gl server is hidden behind it in production deployment.

Caching
=======

There is a plenty of options you can use to create proper caching infrastructure: Varnish, CloudFlare, ...

Securing
========

Nginx can be used to add protection via https, password, referrer, IP address restriction, access keys, etc.

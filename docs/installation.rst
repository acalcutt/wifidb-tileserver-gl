============
Installation
============

Docker
======

When running docker image, no special installation is needed -- the docker will automatically download the image if not present.

Just run ``docker run -it -v $(pwd):/data -p 8080:80 klokantech/tileserver-gl``.

NPM
===

Just run ``npm install -g tileserver-gl``.


From source
===========

Make sure you have Node v4 or higher (nvm install 4) and run::

  npm install
  node .

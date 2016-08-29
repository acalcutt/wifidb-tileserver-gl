============
Installation
============

Docker
======

When running docker image, no special installation is needed -- the docker will automatically download the image if not present.

Just run ``docker run -it -v $(pwd):/data -p 8080:80 klokantech/tileserver-gl``.

npm
===

Just run ``npm install -g tileserver-gl``.

``tileserver-gl-light`` on npm
==============================

Alternatively, you can use ``tileserver-gl-light`` package instead, which is pure javascript (does not have any native dependencies) and can run anywhere, but does not contain rasterization features.


From source
===========

Make sure you have Node v4 or higher (nvm install 4) and run::

  npm install
  node .


On OSX
======

Make sure to have ``pkg-config`` and ``cairo`` installed::

  brew install pkg-config cairo

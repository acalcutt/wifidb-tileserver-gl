# TileServer GL
[![Build Status](https://travis-ci.org/klokantech/tileserver-gl.svg?branch=master)](https://travis-ci.org/klokantech/tileserver-gl)
[![Docker Hub](https://img.shields.io/badge/docker-hub-blue.svg)](https://hub.docker.com/r/klokantech/tileserver-gl/)


## Quickstart
Use `npm install -g tileserver-gl` to install the package from npm.

Then you can simply run `tileserver-gl zurich_switzerland.mbtiles` to start the server for the given mbtiles.

Alternatively, you can use `tileserver-gl-light` package instead, which is pure javascript (does not have any native dependencies) and can run anywhere, but does not contain rasterization features.

Or you can use `docker run -it -v $(pwd):/data -p 8080:80 klokantech/tileserver-gl` to run the server inside a docker container.

Prepared vector tiles can be downloaded from [OSM2VectorTiles](http://osm2vectortiles.org/).

## Documentation
You can read full documentation of this project at http://tileserver.readthedocs.io/.
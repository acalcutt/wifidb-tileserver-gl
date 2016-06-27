# TileServer GL
[![Build Status](https://travis-ci.org/klokantech/tileserver-gl.svg?branch=master)](https://travis-ci.org/klokantech/tileserver-gl)
[![Docker Hub](https://img.shields.io/badge/docker-hub-blue.svg)](https://hub.docker.com/r/klokantech/tileserver-gl/)


## Installation

### Docker
 - `docker run -it -v $(pwd):/data -p 8080:80 klokantech/tileserver-gl`

### Without docker
 - Make sure you have Node v4 or higher (`nvm install 4`)
 - `npm install`
 - `node src/main.js`

## Sample data
Sample data can be downloaded at https://github.com/klokantech/tileserver-gl-data/archive/master.zip

#### Usage
- unpack somewhere and `cd` to the directory
- `docker run -it -v $(pwd):/data -p 8080:80 klokantech/tileserver-gl`
  - (or `node path/to/repo/src/main.js`)

## Configuration

Create `config.json` file in the root directory.
The config file can contain definition of several paths where the tiles will be served.

### Example configuration file
See https://github.com/klokantech/tileserver-gl-data/blob/master/config.json

**Note**: To specify local mbtiles as source of the vector tiles inside the style, use urls with `mbtiles` protocol with path relative to the `cwd + options.paths.root + options.paths.mbtiles`. (For example `mbtiles://switzerland.mbtiles`)

## Available URLs

- If you visit the server on the configured port (default 8080) you should see your maps appearing in the browser.
- Style is served at `/styles/{id}.json` (+ array at `/styles.json`)
  - Sprites at `/styles/{id}/sprite[@2x].{format}`
  - Fonts at `/fonts/{fontstack}/{start}-{end}.pbf`
- Rendered tiles are at `/styles/{id}/rendered/{z}/{x}/{y}[@2x].{format}`
  - The optional `@2x` (or `@3x`) part can be used to render HiDPI (retina) tiles
  - Available formats: `png`, `jpg` (`jpeg`), `webp`
  - TileJSON at `/styles/{id}/rendered.json`
- Static images are rendered at:
  - `/styles/{id}/static/{lon},{lat},{zoom}[@{bearing}[,{pitch}]]/{width}x{height}[@2x].{format}` (center-based)
  - `/styles/{id}/static/{minx},{miny},{maxx},{maxy}/{width}x{height}[@2x].{format}` (area-based)
  - `/styles/{id}/static/auto/{width}x{height}[@2x].{format}` (autofit path -- see below)
  - The static image endpoints additionally support following query parameters:
    - `path` - comma-separated `lng,lat`, pipe-separated pairs
      - e.g. `5.9,45.8|5.9,47.8|10.5,47.8|10.5,45.8|5.9,45.8`
    - `latlng` - indicates the `path` coordinates are in `lat,lng` order rather than the usual `lng,lat`
    - `fill` - color to use as the fill (e.g. `red`, `rgba(255,255,255,0.5)`, `#0000ff`)
    - `stroke` - color of the path stroke
    - `width` - width of the stroke
    - `padding` - "percetange" padding for fitted endpoints (area-based and path autofit)
      - value of `0.1` means "add 10% size to each side to make sure the area of interest is nicely visible"
- Source data at `/data/{mbtiles}/{z}/{x}/{y}.{format}`
  - TileJSON at `/data/{mbtiles}.json`
- Array of all TileJSONs at `/index.json` (`/rendered.json`; `/data.json`)

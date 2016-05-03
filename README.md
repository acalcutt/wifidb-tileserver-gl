# tileserver-gl
[![Build Status](https://travis-ci.org/klokantech/tileserver-gl.svg?branch=master)](https://travis-ci.org/klokantech/tileserver-gl)

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
  - `/styles/{id}/static/{lon},{lat},{zoom}/{width}x{height}[@2x].{format}` (center-based)
  - `/styles/{id}/static/{minx},{miny},{maxx},{maxy}/{zoom}[@2x].{format}` (area-based)
- Source data at `/data/{mbtiles}/{z}/{x}/{y}.{format}`
  - TileJSON at `/data/{mbtiles}.json`
- Array of all TileJSONs at `/index.json` (`/rendered.json`; `/data.json`)

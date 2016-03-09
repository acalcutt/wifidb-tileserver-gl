# tileserver-gl
[![Build Status](https://travis-ci.org/klokantech/tileserver-gl.svg?branch=master)](https://travis-ci.org/klokantech/tileserver-gl)

## Installation

### Docker
 - `docker run -it -v $(pwd):/data -p 8080:80 klokantech/tileserver-gl`

### Without docker
 - Make sure you have Node v4 or higher (`nvm install 4`)
 - `npm install`
 - `node src/main.js`

## Configuration

Create `config.json` file in the root directory.
The config file can contain definition of several paths where the tiles will be served.

Every path needs to have `root` specified. All other paths (in the config (`style`) **and** in the style (`sprites`, `glyphs`, `sources`, ...)) are relative to this root.

For raster endpoints specify `style`, for serving raw `pbf` vector tiles specify `mbtiles` property.

Alternative `domains` can be specified (array or comma-separated string). These will be used to generate tile urls for `index.json`.

Every path can also have `options` object and its content is directly copied into served `index.json`.
The `options.format` can be used to modify the extension in tile urls inside `index.json`, but the server will still serve all the supported formats.

### Example configuration file

Example styles can be downloaded from https://github.com/klokantech/osm2vectortiles-gl-styles.
Rendered vector tiles can be found at http://osm2vectortiles.org/downloads/.

```json
{
  "/basic": {
    "root": "test_data",
    "style": "styles/basic-v8.json",
    "domains": [
      "localhost:8080",
      "127.0.0.1:8080"
    ],
    "options": {
      "type": "overlay",
      "bounds": [5.8559113, 45.717995, 10.5922941, 47.9084648]
    }
  },
  "/hybrid": {
    "root": "test_data",
    "style": "styles/satellite-hybrid-v8.json",
    "options": {
      "format": "webp"
    }
  },
  "/switzerland-vector": {
    "root": "test_data",
    "mbtiles": "switzerland.mbtiles"
  }
}
```
**Note**: To specify local mbtiles as source of the vector tiles inside the style, use urls with `mbtiles` protocol with path relative to the `root`. (For example `mbtiles://switzerland.mbtiles`)

## Available URLs

- If you visit the server on the configured port (default 8080) you should see your maps appearing in the browser.
- The tiles itself are served at `/{basename}/{z}/{x}/{y}[@2x].{format}`
  - The optional `@2x` (or `@3x`) part can be used to render HiDPI (retina) tiles
- Static images (only for raster tiles) are rendered at:
  - `/{basename}/static/{lon},{lat},{zoom}/{width}x{height}[@2x].{format}` (center-based)
  - `/{basename}/static/{minx},{miny},{maxx},{maxy}/{zoom}[@2x].{format}` (area-based)
- TileJSON at `/{basename}/index.json`
- Array of all TileJSONs at `/index.json`
- Available formats:
  - raster: `png`, `jpg` (`jpeg`), `webp`
  - vector: `pbf`

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
Sample data can be downloaded at https://github.com/klokantech/tileserver-gl/releases/download/v0.0.2/test_data.zip

#### Usage
- unpack somewhere and `cd` to the directory
- `docker run -it -v $(pwd):/data -p 8080:80 klokantech/tileserver-gl`
  - (or `node path/to/repo/src/main.js`)

#### Data
- tiles from http://osm2vectortiles.org/
- styles modified from https://github.com/klokantech/osm2vectortiles-gl-styles

## Configuration

Create `config.json` file in the root directory.
The config file can contain definition of several paths where the tiles will be served.

### Example configuration file

```json
{
  "options": {
    "paths": {
      "root": "",
      "fonts": "glyphs",
      "sprites": "sprites",
      "styles": "styles",
      "mbtiles": ""
    },
    "domains": [
      "localhost:8080",
      "127.0.0.1:8080"
    ],
    "formatEncoding": {
      "png": 6,
      "jpeg": 80,
      "webp": 90
    }
  },
  "styles": {
    "test": {
      "style": "basic-v8.json",
      "tilejson": {
        "type": "overlay",
        "bounds": [8.44806, 47.32023, 8.62537, 47.43468]
      }
    },
    "hybrid": {
      "style": "satellite-hybrid-v8.json",
      "serve_rendered": false,
      "tilejson": {
        "format": "webp",
        "center": [8.536715, 47.377455, 6]
      }
    },
    "streets": {
      "style": "streets-v8.json",
      "serve_data": false,
      "tilejson": {
        "center": [8.536715, 47.377455, 6]
      }
    }
  },
  "data": {
    "zurich-vector": {
      "mbtiles": "zurich.mbtiles"
    }
  }
}
```
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
  - `/styles/{id}/rendered/static/{lon},{lat},{zoom}/{width}x{height}[@2x].{format}` (center-based)
  - `/styles/{id}/rendered/static/{minx},{miny},{maxx},{maxy}/{zoom}[@2x].{format}` (area-based)
- Source data at `/data/{mbtiles}/{z}/{x}/{y}.{format}`
  - TileJSON at `/data/{mbtiles}.json`
- Array of all TileJSONs at `/index.json` (`/rendered.json`; `/data.json`)

#https://osmdata.openstreetmap.de/
#ogr2ogr -f GeoJSON water.geojson data/water-polygons-split-4326/water_polygons.shp
#ogr2ogr -f GeoJSON land.geojson data/land-polygons-complete-4326/land_polygons.shp
#ogr2ogr -f GeoJSON coastlines.geojson data/coastlines-split-4326/lines.shp

[ ! -f data/water-polygons-split-4326.zip ] && wget https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip -P data
unzip -o data/water-polygons-split-4326.zip -d data

[ ! -f data/land-polygons-complete-4326.zip ] && wget https://osmdata.openstreetmap.de/download/land-polygons-complete-4326.zip -P data
unzip -o data/land-polygons-complete-4326.zip -d data

[ ! -f data/coastlines-split-4326.zip ] && wget https://osmdata.openstreetmap.de/download/coastlines-split-4326.zip -P data
unzip -o data/coastlines-split-4326.zip -d data

[ ! -f data/water.geojson ] && ogr2ogr -progress -f GeoJSON data/water.geojson data/water-polygons-split-4326/water_polygons.shp
[ ! -f data/land.geojson ] && ogr2ogr -progress -f GeoJSON data/land.geojson data/land-polygons-complete-4326/land_polygons.shp
[ ! -f data/coastlines.geojson ] && ogr2ogr -progress -f GeoJSON data/coastlines.geojson data/coastlines-split-4326/lines.shp

/opt/tippecanoe-1.35.0/tippecanoe -zg -o data/osm_basemap.mbtiles --drop-densest-as-needed --extend-zooms-if-still-dropping data/land.geojson data/water.geojson data/coastlines.geojson
#https://osmdata.openstreetmap.de/
#ogr2ogr -f GeoJSON water.geojson water-polygons-split-4326/water_polygons.shp
#ogr2ogr -f GeoJSON land.geojson land-polygons-complete-4326/land_polygons.shp
#ogr2ogr -f GeoJSON coastlines.geojson coastlines-split-4326/lines.shp

/opt/tippecanoe-1.35.0/tippecanoe -zg -o /opt/convert/osm_base.mbtiles --drop-densest-as-needed --extend-zooms-if-still-dropping land.geojson water.geojson coastlines.geojson ne_10m_lakes.geojson ne_10m_rivers_lake_centerlines.geojson ne_10m_admin_1_states_provinces.geojson
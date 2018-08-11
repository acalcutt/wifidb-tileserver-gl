#!/bin/bash
PATH="/root/.nvm/versions/node/v8.11.3/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
echo "Cleanup Old Files"
rm /opt/convert/WifiDB.json
rm /opt/convert/WifiDB.mbtiles
rm /opt/convert/WifiDB_Legacy.json
rm /opt/convert/WifiDB_Legacy.mbtiles
echo "Downloading WifiDB.json"
scp -r root@172.16.1.112:/srv/www/virtual/live.wifidb.net/wifidb/out/geojson/WifiDB.json /opt/convert/
scp -r root@172.16.1.112:/srv/www/virtual/live.wifidb.net/wifidb/out/geojson/WifiDB_Legacy.json /opt/convert/
echo "Convert Geojson to mbtiles"
#/opt/tippecanoe/tippecanoe -zg --drop-densest-as-needed -r1 -n "WifiDB" -o /opt/convert/WifiDB.mbtiles /opt/convert/WifiDB.json
#/opt/tippecanoe/tippecanoe -zg --no-tile-size-limit -r1 -n "WifiDB" -o /opt/convert/WifiDB.mbtiles /opt/convert/WifiDB.json
#/opt/tippecanoe/tippecanoe -zg --cluster-densest-as-needed -r1 -n "WifiDB" -o /opt/convert/WifiDB.mbtiles /opt/convert/WifiDB.json

/opt/tippecanoe/tippecanoe -z16 --cluster-densest-as-needed -r1 -n "WifiDB $(date -d "today" +"%Y-%m-%d %H:%M")" -o /opt/convert/WifiDB.mbtiles /opt/convert/WifiDB.json
/opt/tippecanoe/tippecanoe -z16 --cluster-densest-as-needed -r1 -n "WifiDB_Legacy $(date -d "today" +"%Y-%m-%d %H:%M")" -o /opt/convert/WifiDB_Legacy.mbtiles /opt/convert/WifiDB_Legacy.json
mv /opt/convert/WifiDB.mbtiles /opt/tileserver-gl/data/
mv /opt/convert/WifiDB_Legacy.mbtiles /opt/tileserver-gl/data/
/etc/init.d/tileserver stop
/etc/init.d/tileserver start

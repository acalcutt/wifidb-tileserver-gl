#!/bin/bash
PATH="/root/.nvm/versions/node/v8.11.3/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
echo "---Cleanup Old Files---"
if [ -e "/opt/convert/WifiDB_0to1year.json" ]; then rm /opt/convert/WifiDB_0to1year.json; fi
if [ -e "/opt/convert/WifiDB_1to2year.json" ]; then rm /opt/convert/WifiDB_1to2year.json; fi
if [ -e "/opt/convert/WifiDB_2to3year.json" ]; then rm /opt/convert/WifiDB_2to3year.json; fi
if [ -e "/opt/convert/WifiDB_Legacy.json" ]; then rm /opt/convert/WifiDB_Legacy.json; fi
if [ -e "/opt/convert/WifiDB.mbtiles" ]; then rm /opt/convert/WifiDB.mbtiles; fi

echo "---Downloading WifiDB.json---"
scp -r root@172.16.1.112:/srv/www/virtual/live.wifidb.net/wifidb/out/geojson/WifiDB_0to1year.json /opt/convert/
scp -r root@172.16.1.112:/srv/www/virtual/live.wifidb.net/wifidb/out/geojson/WifiDB_1to2year.json /opt/convert/
scp -r root@172.16.1.112:/srv/www/virtual/live.wifidb.net/wifidb/out/geojson/WifiDB_2to3year.json /opt/convert/
scp -r root@172.16.1.112:/srv/www/virtual/live.wifidb.net/wifidb/out/geojson/WifiDB_Legacy.json /opt/convert/

echo "---Convert Geojson to mbtiles---"
/opt/tippecanoe/tippecanoe -z16 --cluster-densest-as-needed -r1 -n "WifiDB $(date -d "today" +"%Y-%m-%d %H:%M")" -o /opt/convert/WifiDB.mbtiles /opt/convert/WifiDB_0to1year.json /opt/convert/WifiDB_1to2year.json /opt/convert/WifiDB_2to3year.json /opt/convert/WifiDB_Legacy.json

echo "---Move file and restart tileserver gl---"
mv /opt/convert/WifiDB.mbtiles /opt/tileserver-gl/data/
/etc/init.d/tileserver stop
/etc/init.d/tileserver start

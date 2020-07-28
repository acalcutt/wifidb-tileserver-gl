#!/bin/bash

Input_Folder='/opt/convert/in'
Output_Folder='/opt/convert/out'
Tmp_Folder='/tmp'
TileServer_Data='/opt/tileserver-gl/data'
tippecanoe_bin='/opt/tippecanoe-1.35.0'
WifiDB_BaseURL='https://wifidb.net/wifidb/out/geojson'

echo "---Cleanup Old Files---"
if [ -e $Input_Folder/WifiDB_weekly.json ]; then rm $Input_Folder/WifiDB_weekly.json; echo "Deleting $Input_Folder/WifiDB_weekly.json"; fi
if [ -e $Input_Folder/WifiDB_monthly.json ]; then rm $Input_Folder/WifiDB_monthly.json; echo "Deleting $Input_Folder/WifiDB_monthly.json"; fi
if [ -e $Input_Folder/WifiDB_0to1year.json ]; then rm $Input_Folder/WifiDB_0to1year.json; echo "Deleting $Input_Folder/WifiDB_0to1year.json"; fi
if [ -e $Input_Folder/WifiDB_1to2year.json ]; then rm $Input_Folder/WifiDB_1to2year.json; echo "Deleting $Input_Folder/WifiDB_1to2year.json"; fi
if [ -e $Input_Folder/WifiDB_2to3year.json ]; then rm $Input_Folder/WifiDB_2to3year.json; echo "Deleting $Input_Folder/WifiDB_2to3year.json"; fi
if [ -e $Input_Folder/WifiDB_Legacy.json ]; then rm $Input_Folder/WifiDB_Legacy.json; echo "Deleting $Input_Folder/WifiDB_Legacy.json"; fi
if [ -e $Input_Folder/cell_networks.json ]; then rm $Input_Folder/cell_networks.json; echo "Deleting $Input_Folder/cell_networks.json"; fi
if [ -e $Output_Folder/cell_networks.mbtiles ]; then rm $Output_Folder/cell_networks.mbtiles; echo "Deleting $Output_Folder/cell_networks.mbtiles"; fi
if [ -e $Output_Folder/WifiDB_newest.mbtiles ]; then rm $Output_Folder/WifiDB_newest.mbtiles; echo "Deleting $Output_Folder/WifiDB_newest.mbtiles"; fi
if [ -e $Output_Folder/WifiDB.mbtiles ]; then rm $Output_Folder/WifiDB.mbtiles; echo "Deleting $Output_Folder/WifiDB.mbtiles"; fi

echo "---Downloading WifiDB.json---"
wget -O $Input_Folder/WifiDB_weekly.json $WifiDB_BaseURL/WifiDB_weekly.json
wget -O $Input_Folder/WifiDB_monthly.json $WifiDB_BaseURL/WifiDB_monthly.json
wget -O $Input_Folder/WifiDB_0to1year.json $WifiDB_BaseURL/WifiDB_0to1year.json
wget -O $Input_Folder/WifiDB_1to2year.json $WifiDB_BaseURL/WifiDB_1to2year.json
wget -O $Input_Folder/WifiDB_2to3year.json $WifiDB_BaseURL/WifiDB_2to3year.json
wget -O $Input_Folder/WifiDB_Legacy.json $WifiDB_BaseURL/WifiDB_Legacy.json
wget -O $Input_Folder/cell_networks.json $WifiDB_BaseURL/cell_networks.json

echo "---Convert Geojson to mbtiles---"
$tippecanoe_bin/tippecanoe -z18 -t $Tmp_Folder -M 750000 -O 500000 -o $Output_Folder/cell_networks.mbtiles -n "WifiDB_cell $(date -d "today" +"%Y-%m-%d %H:%M")" -A "<a href=""https://wifidb.net/"" target=""_blank"">&copy; WifiDB $(date -d "today" +"%Y-%m-%d")</a>" --drop-densest-as-needed $Input_Folder/cell_networks.json
$tippecanoe_bin/tippecanoe -z18 -t $Tmp_Folder -M 750000 -O 500000 -o $Output_Folder/WifiDB_newest.mbtiles -n "WifiDB_newest $(date -d "today" +"%Y-%m-%d %H:%M")" -A "<a href=""https://wifidb.net/"" target=""_blank"">&copy; WifiDB $(date -d "today" +"%Y-%m-%d")</a>" --drop-densest-as-needed $Input_Folder/WifiDB_0to1year.json $Input_Folder/WifiDB_monthly.json $Input_Folder/WifiDB_weekly.json
$tippecanoe_bin/tippecanoe -z18 -t $Tmp_Folder -M 750000 -O 500000 -o $Output_Folder/WifiDB.mbtiles -n "WifiDB $(date -d "today" +"%Y-%m-%d %H:%M")" -A "<a href=""https://wifidb.net/"" target=""_blank"">&copy; WifiDB $(date -d "today" +"%Y-%m-%d")</a>" --drop-densest-as-needed $Input_Folder/WifiDB_Legacy.json $Input_Folder/WifiDB_2to3year.json $Input_Folder/WifiDB_1to2year.json

echo "---Move file and restart tileserver gl---"
mv $Output_Folder/cell_networks.mbtiles $TileServer_Data
mv $Output_Folder/WifiDB_newest.mbtiles $TileServer_Data
mv $Output_Folder/WifiDB.mbtiles $TileServer_Data

systemctl restart Tileserver.service
systemctl status Tileserver.service


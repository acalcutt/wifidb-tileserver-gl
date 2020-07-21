GeoJsonDir='geojson'
mkdir $GeoJsonDir

#--- From https://www.naturalearthdata.com/downloads/10m-physical-vectors/ ---
if [ ! -f "10m_physical.zip" ]; then wget https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/physical/10m_physical.zip; fi
unzip 10m_physical.zip -d 10m_physical
for i in `find 10m_physical -name "*.shp" -type f`; do
	outfile="$GeoJsonDir/physical_$(basename -- ${i%.*}).geojson"
	echo "$i -> $outfile"
	ogr2ogr -f GeoJSON $outfile $i
done
rm -rf 10m_physical

#--- From https://www.naturalearthdata.com/downloads/10m-cultural-vectors/ ---
if [ ! -f "10m_cultural.zip" ]; then wget https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/10m_cultural.zip; fi
unzip 10m_cultural.zip -d 10m_cultural
for i in `find 10m_cultural -name "*.shp" -type f`; do
	outfile="$GeoJsonDir/cultural_$(basename -- ${i%.*}).geojson"
	echo "$i -> $outfile"
	ogr2ogr -f GeoJSON $outfile $i
done
rm -rf 10m_cultural


#Create a list of filenames
filelist=''
for i in `ls -lA geojson/*.geojson | awk -F':[0-9]* ' '/:/{print $2}'`; do
	file=$i
	filelist+=" $file"
done

echo $filelist

#Create a mbtiles file with tippecanoe. each file in $filelist will be its own layer
/opt/tippecanoe-1.35.0/tippecanoe -z8 -M 750000 -O 500000 -o ne_basemap.mbtiles --coalesce-densest-as-needed --extend-zooms-if-still-dropping $filelist
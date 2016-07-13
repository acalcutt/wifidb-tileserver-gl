#!/bin/bash
if [ ! -f /data/config.json ]; then
  echo "INFO: No config.json found! Downloading sample data..."
  echo "--------------------------------------------------------------------------------"
  curl -L -o sample_data.zip https://github.com/klokantech/tileserver-gl-data/archive/v0.8.0.zip
  unzip -q sample_data.zip -d sample_data
  mv sample_data/tileserver-gl-data-*/* -t /data
  rm sample_data.zip
  rm -r sample_data
fi
xvfb-run -a -e /dev/stdout --server-args="-screen 0 1024x768x24" node /usr/src/app/src/main.js -p 80 -c /data/config.json

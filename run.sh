#!/bin/bash
xvfb-run -a -e /dev/stdout --server-args="-screen 0 1024x768x24" node /usr/src/app/src/main.js -p 80 -c /data/config.json

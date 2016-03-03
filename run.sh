#!/bin/bash
xvfb-run --server-args="-screen 0 1024x768x24" node /usr/src/app/src/main.js -p 80 -c /data/config.json

#!/bin/bash
cd /data
xvfb-run -a -e /dev/stdout --server-args="-screen 0 1024x768x24" node /usr/src/app/ -p 80 "$@"

#!/usr/bin/env node

'use strict';

/*
 * This script creates `tileserver-gl-light` version
 * (without native dependencies) and publishes
 * `tileserver-gl` and `tileserver-gl-light` to npm.
 */

/* CREATE tileserver-gl-light */

// SYNC THE `light` FOLDER
require('child_process').execSync('rsync -av --exclude="light" --exclude=".git" --exclude="node_modules" --delete . light', {
  stdio: 'inherit'
});

// PATCH `package.json`
var fs = require('fs');
var packageJson = require('./package');

packageJson.name += '-light';
delete packageJson.dependencies['canvas'];
delete packageJson.dependencies['mapbox-gl-native'];
delete packageJson.dependencies['node-pngquant-native'];
delete packageJson.dependencies['sharp'];

delete packageJson.devDependencies;

var str = JSON.stringify(packageJson, undefined, 2);
fs.writeFileSync('light/package.json', str);

/* PUBLISH */

// tileserver-gl
require('child_process').execSync('npm publish .', {
  stdio: 'inherit'
});

// tileserver-gl-light
require('child_process').execSync('npm publish light', {
  stdio: 'inherit'
});

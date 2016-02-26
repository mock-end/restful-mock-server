#!/usr/bin/env node

var colors = require('colors');
var pkg = require('../package.json');
var console = require('../lib/console');
var startServer = require('../lib');

process.title = pkg.name;

var options = console.parse(process.argv);

startServer(options);

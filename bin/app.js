#!/usr/bin/env node

var pkg = require('../package.json');
var console = require('../lib/console');

process.title = pkg.name;

var options = console.parse(process.argv);

console.printLogo('magenta');

require('../lib')(options);

# restful-mock-server

A mock server returning random JSON from schema. 

[![MIT License](https://img.shields.io/badge/license-MIT_License-green.svg?style=flat-square)](https://github.com/bubkoo/restful-mock-server/blob/master/LICENSE)

[![npm:](https://img.shields.io/npm/v/restful-mock-server.svg?style=flat-square)](https://www.npmjs.com/packages/restful-mock-server)
[![downloads:?](https://img.shields.io/npm/dm/restful-mock-server.svg?style=flat-square)](https://www.npmjs.com/packages/restful-mock-server)
[![dependencies:?](https://img.shields.io/david/bubkoo/restful-mock-server.svg?style=flat-square)](https://david-dm.org/bubkoo/restful-mock-server)

## Install

First make sure you have installed the latest version of [node.js](http://nodejs.org/) 
(You may need to restart your computer after this step).

From NPM for use as a command line app:

```
$ npm install restful-mock-server -g
```

From NPM for programmatic use:

```
$ npm install restful-mock-server
```


## Usage

```
$ mock [options] [--rules path-to-rules.js]
```

The available options are:

```
  -r, --rules file .......... Specified an rule file. `mock --help rules` for more information.
  -p, --port port ........... Specify the port for proxy server. Default: 9528.
  -h, --host host ........... Specify the hostname for proxy server. Default: '127.0.0.1'.
  -w, --watch ............... When true the rules will auto update when the rule files changed.
  -d, --debug ............... Show debugging information whilst running. Default: true.
  -v, --verbose ............. Show verbose logging whilst running. Default: false.
  -s, --silent .............. Disable any logs. Default: false.
  --sensitive ............... When true the route will be case sensitive. Default: false.
  --strict .................. When false the trailing slash is optional. Default: false.
  --end ..................... When false the path will match at the beginning. Default: true.
  -V, --version ............. Print the current version.
  -h, --help ................ You're looking at it.
  -h, --help command ........ Show details for the specified command.
  --no-color ................ Disable colors in the console.
```

## API Reference

Assuming installation via NPM, you can load this module in your application like this:

```js
var mockServer = require("restful-mock-server");
mockServer(options);
```


## Related

- [json-from-template](https://github.com/bubkoo/json-from-template) Generate random JSON(plain old object) from the given template.
- [generate-random-data](https://github.com/bubkoo/generate-random-data) Javascript utilities for generating random data.

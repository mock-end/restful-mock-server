var exit = require('exit');
var colors = require('colors/safe');
var version = require('./version');
var help = require('./help');


var flags = {
  '--debug': 'debug',
  '--verbose': 'verbose',
  '--silent': 'silent',
  '--watch': 'watch',
  // alias
  '-d': 'debug',
  '-v': 'verbose',
  '-s': 'silent',
  '-w': 'watch'
};

var pairs = {
  '--port': 'port',
  '--host': 'host',
  '--rules': 'rules',

  '--sensitive': 'sensitive',
  '--strict': 'strict',
  '--end': 'end',

  '--key': 'key',
  '--cert': 'cert',
  '--ca': 'ca',
  '--passphrase': 'passphrase',


  // alias
  '-p': 'port',
  '-h': 'host',
  '-r': 'rules'
};

function missPair(key) {
  console.log('You must supply an argument for the "' + key + '" option.');
  exit(1);
}

exports.printLogo = function (methods) {
  var logo = help('logo');

  if (typeof methods === 'string') {
    methods = [methods];
  }

  for (var i = 0, l = methods.length; i < l; i++) {
    var method = methods[i];
    if (colors[method]) {
      logo = colors[method](logo);
    }
  }
  console.log(logo);
};

exports.printHelp = function printHelp(type) {
  console.log(help(type));
  exit(1);
};

exports.printVersion = function printVersion() {
  console.log(version);
  exit(1);
};

exports.parse = function (argv) {
  var options = {};
  var eatNext = false;

  for (var i = 2, l = argv.length; i < l; i++) {
    var arg = argv[i];

    if (eatNext) {

      if (arg[0] === '-') {
        missPair(argv[i - 1]);
      }
      options[eatNext] = arg;
      eatNext = false;

    } else if (arg === '--help' || arg === '-h') {

      var helpItem = i + 1 < l ? argv[i + 1] : '';

      if (helpItem && helpItem[0] !== '-') {
        i += 1;
      }

      if ((helpItem && helpItem[0] !== '-') || !helpItem) {
        exports.printHelp(helpItem);
      }

    } else if (arg === '--version' || arg === '-V') {
      exports.printVersion();
    } else if (flags[arg]) {
      options[flags[arg]] = true;
    } else if (pairs[arg]) {
      eatNext = pairs[arg];
    } else {
      console.log('  Unknown option: ', arg, '\n');
      exports.printHelp('usage');
    }
  }

  if (eatNext) {
    missPair(argv[i - 1]);
  }

  return options;
};

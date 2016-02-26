var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');

var _ = require('lodash');
var exit = require('exit');
var colors = require('colors');
var connect = require('connect');
var bodyParser = require('body-parser');
var qs = require('qs');
var morgan = require('morgan');

var portscanner = require('portscanner');
var async = require('async');
var Gaze = require('gaze').Gaze;
var parseUrl = require('parseurl');

var defaults = require('./options');
var printer = require('./console');
var file = require('./utils/file');


module.exports = function (options) {

  options = _.merge({}, defaults, options);

  // logs
  // ----

  var isSilent = options.silent === true;
  var hasDebug = options.silent === false
    && options.debug === true
    || options.verbose === true;
  var hasVerbose = options.silent === false && options.verbose === true;

  function warn(msg) {
    if (!isSilent) {
      console.log((msg).yellow);
    }
  }

  function debug(msg) {

    if (hasDebug) {
      console.log(msg);
    }
  }

  function verbose(msg) {

    if (hasVerbose) {
      console.log((msg).grey);
    }
  }

  function fatal(e, errcode) {

    var msg = ('Fatal error: ' + (e.message || e)).red;

    console.log(msg);

    exit(errcode || 1);
  }


  var server = options.server;
  var rules = options.rules;
  var pipes = [

    // logo
    function (next) {

      if (options.debug || options.verbose) {
        printer.printLogo('magenta');
      }

      next();
    },

    // check protocol
    function (next) {

      if (!server) {
        if (!options.protocol) {
          options.protocol = 'http';
        } else if (options.protocol !== 'http' && options.protocol !== 'https') {
          fatal('Protocol must be \'http\' or \'https\'.');
        }
      }

      next();
    },

    // check port
    function (next) {

      if (!server) {
        if (options.port) {

          portscanner.checkPortStatus(options.port, options.host,
            function (error, status) {
              if (status === 'closed') {
                next();
              } else {
                fatal('Port ' + options.port + ' is already in use by another process.');
              }
            });

        } else {

          portscanner.findAPortNotInUse(8888, 65535, options.host,
            function (error, foundPort) {
              options.port = foundPort;
              next();
            });
        }
      } else {
        next();
      }
    },

    // parse the rules
    function (next) {

      var result = {};

      if (rules) {

        if (!_.isArray(rules)) {
          rules = [rules];
        }

        _.forEach(rules, function (rule) {

          var section = rule;

          if (_.isString(rule)) {

            try {
              section = JSON.parse(rule);
            } catch (e) {
              try {
                section = file.importRules(rule) || {};
              } catch (e) {
                warn(e.message || e);
              }
            }
          }

          result = _.merge(result, section);

        });
      }

      options.rules = result;
      next();
    },

    // middleware: parse params
    function (next) {

      var app = connect();

      // application/json
      app.use(bodyParser.json());

      // application/x-www-form-urlencoded
      app.use(bodyParser.urlencoded({ extended: false }));

      // url parameters
      app.use(function (req, res, next) {
        if (!req.query) {
          req.query = ~req.url.indexOf('?')
            ? qs.parse(parseUrl(req).query)
            : {};
        }
        next();
      });

      next(null, app);

    },

    // middleware：print request
    function (app, next) {
      if (options.debug === true) {
        app.use(morgan('' +
          '[MOCK DEBUG INFO]\\n'.magenta +
          ' - Request:\\n'.cyan +
          '     method: '.yellow + ':method HTTP/:http-version\\n' +
          '     url:    '.yellow + ':url' + '\\n' +
          '     ref:    '.yellow + ':referrer\\n' +
          '     uag:    '.yellow + ':user-agent\\n' +
          '     addr:   '.yellow + ':remote-addr\\n' +
          '     date:   '.yellow + ':date', {
          immediate: true
        }));
      }
      next(null, app);
    },

    // middleware：dispatcher
    function (app, next) {

      app.use(function (req, res, next) {
        //dispatcher.handle(req, res);
        next();
      });

      next(null, app);
    },

    // middleware：print response
    function (app, next) {

      if (options.debug === true) {
        app.use(function (req, res, next) {
          console.log('     params: '.yellow);
          console.log(formatJSON(req.params, '         '));
          console.log(' - Response:'.cyan);
          console.log('     status: '.yellow + (res.statusCode === 200 ? 200 : (res.statusCode + '').red));
          console.log('     length: '.yellow + Buffer.byteLength(JSON.stringify(res.body || {})) + ' byte');
          next();
        });


        app.use(morgan('' +
            // '     length: '.yellow + ':res[content-length] byte\\n' +
          '     timing: '.yellow + ':response-time ms', {
          immediate: true
        }));

        app.use(function (req, res, next) {
          var data = formatJSON(res.body, '         '),
            cookies;

          if (res.cookies) {
            cookies = formatJSON(res.cookies, '         ');
            console.log('     cookies:'.yellow);
            console.log(cookies);
          }

          console.log('     data:   '.yellow);
          if (data) {
            console.log(data);
          }

          console.log('\nWaiting for next request...\n'.italic.grey);

          next();
        });

      } else {
        app.use(morgan('[:method] :url'.green, {
          immediate: true
        }));
      }

      next(null, app);
    },

    function (app, next) {

      if (!server) {

        if (options.protocol === 'http') {
          server = http.createServer(app);
        } else {
          server = https.createServer({
            passphrase: options.passphrase || 'mock',
            cert: options.cert || file.readCerts('server.crt'),
            key: options.key || file.readCerts('server.key'),
            ca: options.ca || file.readCerts('ca.crt')
          }, app);
        }

      } else {

      }

      options.server = server;
      next(null, app);
    },

    function () {

      server
        .listen(options.port, options.host)
        .once('listening', function () {

          var meta = server.address();
          var hostname = meta.address || '0.0.0.0';
          var port = meta.port === 80 ? '' : ':' + meta.port;
          var target = options.protocol + '://' + hostname + port;

          debug('Mock server started on ' + (target).underline + '\n');

        })
        .on('error', function (error) {
          if (error.code === 'EADDRINUSE') {
            fatal('Port ' + options.port + ' is already in use by another process.');
          } else {
            fatal(error);
          }
        });
    }
  ];

  async.waterfall(pipes);
};

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
var Router = require('./router');
var formatJSON = require('./utils/formatJSON');


module.exports = function (options) {

  options = _.merge({}, defaults, options);

  var router;
  var server = options.server;
  var rules = options.rules;


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

    var msg = ('Fatal: ' + (e.message || e)).red;

    console.log(msg);

    exit(errcode || 1);
  }

  function parseRules() {

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

    router = new Router(options);

    return result;
  }


  var pipes = [

    // print logo
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

    // parse rules
    function (next) {
      parseRules();
      next();
    },

    // watcher
    function (next) {

      if (options.watch) {

        var files;

        try {
          files = file.getWatchedFiles(rules, options.watch);
        } catch (e) {
          warn(e.message || e);
        }

        new Gaze(files, {
          interval: 1000,
          debounceDelay: 1000
        }, function (err) {

          if (err) {
            fatal(err);
          }

          this.on('error', function (err) {
            warn(err);
          });

          this.on('all', function (event, filepath) {

            debug(('[' + event + ']: ').yellow + (filepath).grey);

            options.rules = parseRules();
          });
        });
      }

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

        req.params = _.merge({}, req.query, req.body);

        next();
      });

      next(null, app);
    },

    // middleware：print request
    function (app, next) {

      if (hasDebug) {
        app.use(morgan(''
          + 'req:'.magenta + '\\n'
          + '  method : '.cyan + ':method HTTP/:http-version\\n'
          + '  path   : '.cyan + ':url', {
          immediate: true
        }));
      }

      next(null, app);
    },

    // middleware：route handler
    function (app, next) {
      app.use(function (req, res, next) {
        router.handle(req, res, next);
      });

      next(null, app);
    },

    // middleware：request params
    function (app, next) {

      if (hasDebug) {
        app.use(function (req, res, next) {

          var params = _.keys(req.params).length
            ? '\n' + formatJSON(req.params, '  ')
            : '-';

          debug('  params : '.cyan + params);

          next();
        });
      }

      if (hasVerbose) {
        app.use(morgan('' +
          '  ref    : :referrer\\n'.grey +
          '  uag    : :user-agent\\n'.grey +
          '  addr   : :remote-addr\\n'.grey +
          '  date   : :date'.grey, {
          immediate: true
        }));
      }

      next(null, app);
    },

    // middleware：print response
    function (app, next) {

      if (hasDebug) {

        app.use(function (req, res, next) {

          var statusCode = res.statusCode === 200
            ? 200
            : ('' + res.statusCode).red;
          var cookies = _.keys(res.cookies).length
            ? '\n' + formatJSON(res.cookies, '  ')
            : '-';
          var body = _.keys(res.body).length
            ? '\n' + formatJSON(res.body, '  ')
            : '-';

          debug(''
            + 'res:'.magenta + '\n'
            + '  status : '.cyan + statusCode + '\n'
            + '  data   : '.cyan + body + '\n'
            + '  cookies: '.cyan + cookies
          );

          next();

        });
      }

      if (hasVerbose) {

        app.use(function (req, res, next) {
          verbose(''
            + '  length : ' + Buffer.byteLength(JSON.stringify(res.body || {})) + ' byte'
          );
          next();
        });

        app.use(morgan('' +
            // '  length : '.yellow + ':res[content-length] byte\\n' +
          '  timing : :response-time ms'.grey, {
          immediate: true
        }));
      }

      if (hasDebug) {
        app.use(function (req, res, next) {
          debug('\nWaiting for next request...\n');
          next();
        });
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
        server.on('request', app);
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

          debug('Mock server started: ' + (target).underline + '\n');

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

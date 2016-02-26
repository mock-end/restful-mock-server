var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');

var _ = require('lodash');
var connect = require('connect');
var bodyParser = require('body-parser');
var qs = require('qs');
var morgan = require('morgan');

var portscanner = require('portscanner');
var async = require('async');
var Gaze = require('gaze').Gaze;
var parseUrl = require('parseurl');


var defaults = {

  // server
  // ------
  server: null,
  protocol: 'http',
  port: '6000',
  host: '127.0.0.1',

  // https
  // -----
  key: '',
  cert: '',
  ca: '',
  passphrase: '',

  // configs
  // -------
  rules: '',          // rule files or rule object
  watch: [],          // 监视规则文件改变, 自动更新规则
  placeholders: {},

  // global mock options
  // -------------------
  delay: 0,           // ms，mock network delay
  timeout: false,     //
  statusCode: 200,    // http(s)'s status code

  sensitive: false,   // 当设置为 true, 将区分路由的大小写
  strict: false,      // 当设置为 true, 路由末尾的斜杠将影响匹配
  end: true,          // 当设置为 false, 将只会匹配 url 前缀

  // logger
  // ------
  debug: true,
  verbose: true
};


function parseRules(rules) {

  var result = {};

  if (_.isString(rules)) {
    rules = [rules];
  }

  if (_.isArray(rules)) {

  }

  result = _.merge({}, rules);
}

function readCerts(filename) {

  var filePath = path.join(__dirname, 'certs', filename);

  return fs.readFileSync(filePath, { encoding: 'utf8' });
}


module.exports = function (options) {

  options = _.assign({}, defaults, options);

  var server = options.server;
  var rules = options.rules;

  var pipes = [

    // parse the rules
    function (next) {

      if (_.isString(rules)) {

        try {
          rules = JSON.parse(rules);
        } catch (e) {

          var path = rules;

        }
      }

      options.rules = rules;

      next();
    },

    // check protocol
    function (next) {

      if (server) {

        next();

      } else {

        if (!options.protocol) {
          options.protocol = 'http';
        } else if (options.protocol !== 'http' && options.protocol !== 'https') {
          console.log('protocol option must be \'http\' or \'https\'.');
        }

        next();

      }
    },

    // check port
    function (next) {

      if (server) {
        next();
      } else {

        if (options.port) {

          portscanner.checkPortStatus(options.port, options.host,
            function (error, status) {
              if (status === 'closed') {
                next();
              } else {
                console.log('Port ' + options.port + ' is already in use by another process.');
              }
            });

        } else {

          portscanner.findAPortNotInUse(8888, 65535, options.host,
            function (error, foundPort) {
              options.port = foundPort;
              next();
            });
        }
      }
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

    function (app, next) {

      if (!server) {

        if (options.protocol === 'http') {
          server = http.createServer(app);
        } else {
          server = https.createServer({
            passphrase: options.passphrase || 'mock',
            cert: options.cert || readCerts('server.crt'),
            key: options.key || readCerts('server.key'),
            ca: options.ca || readCerts('ca.crt')
          }, app);
        }
      }

      options.server = server;

      next(null, app);

    },

    function () {

      server
        .listen(options.port, options.host)
        .once('listening', function () {

        })
        .on('connection', function (socket) {

        })
        .on('error', function (error) {

        });
    }
  ];

  async.waterfall(pipes);
};

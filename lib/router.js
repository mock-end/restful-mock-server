var _ = require('lodash');
var sign = require('cookie-signature').sign;
var cookie = require('cookie');
var parseUrl = require('parseurl');
var mockJSON = require('json-from-template');

var Layer = require('./layer');


function handle(req, res, options, next) {

  handleCookies(req, res, options);

  res.body = compile(options.data, req.params, options);

  if (options.jsonp) {
    handleJSONP(req, res, options);
  } else {
    handleJSON(req, res, options);
  }

  next();
}

function handleCookies(req, res, options) {

  var template = options.cookies;
  if (!template) {
    return;
  }

  var cookies = mockJSON.compile(template, req.params, options.placeholders);
  if (!_.isArray(cookies)) {
    cookies = [cookies];
  }
  res.cookies = cookies;

  _.forEach(cookies, function (cookie) {
    var cookieOptions = cookie.options || {};
    _.forEach(cookie, function (value, name) {
      if (name !== 'options') {
        setCookie(req, res, name, value, cookieOptions);
      }
    });
  });
}

function handleJSON(req, res, options) {

  var body = JSON.stringify(res.body);
  var headers = {
    // CROS
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Requested-With, accept, origin, content-type',
    'Access-Control-Allow-Methods': 'PUT,GET,POST,DELETE,OPTIONS',

    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  };

  res.writeHead(options.statusCode, headers);
  res.end(body);
}

function handleJSONP(req, res, options) {

  var body = JSON.stringify(res.body);
  var key = _.isString(options.jsonp) ? options.jsonp : 'callback';
  var callback = req.params[key];

  if (callback) {
    body = callback + '(' + body + ')';
  }

  var headers = {
    'Content-Type': callback ? 'application/x-javascript' : 'application/json',
    'Content-Length': Buffer.byteLength(body)
  };

  res.writeHead(options.statusCode, headers);
  res.end(body);
}

function handle404(req, res, next) {
  handleStatusCode(req, res, 404, next);
}

function handleTimeout(req, res, timeout, next) {
  if (_.isNumber(timeout) && timeout > 0) {
    setTimeout(function () {
      handleStatusCode(req, res, 504, next);
    }, timeout);
  } else {
    handleStatusCode(req, res, 504, next);
  }
}

function handleStatusCode(req, res, statusCode, next) {
  res.statusCode = statusCode;
  res.end();
  next();
}

function setCookie(req, res, name, val, options) {

  options = _.merge({}, options);
  var secret = req.secret;
  var signed = options.signed;

  if (signed && !secret) {
    throw new Error('cookieParser("secret") required for signed cookies');
  }

  if (_.isNumber(val)) {
    val = String(val);
  } else if (_.isObject(val)) {
    val = 'j:' + JSON.stringify(val);
  }

  if (signed) {
    val = 's:' + sign(val, secret);
  }

  if (_.has(options, 'maxAge')) {
    options.expires = new Date(Date.now() + options.maxAge);
    options.maxAge /= 1000;
  }

  if (null == options.path) {
    options.path = '/';
  }

  var headerVal = cookie.serialize(name, String(val), options);

  // supports multiple 'res.cookie' calls by getting previous value
  var prev = res.getHeader('Set-Cookie');
  if (prev) {
    if (_.isArray(prev)) {
      headerVal = prev.concat(headerVal);
    } else {
      headerVal = [prev, headerVal];
    }
  }

  if (_.isArray(headerVal)) {
    headerVal = headerVal.map(String);
  } else {
    headerVal = String(headerVal);
  }

  res.setHeader('Set-Cookie', headerVal);
}

function getOptions(methods, method, params) {

  var result = {};
  var specified = _.some(methods, function (options, key) {

    var sections = key.split(/\s*\|\s*/g);
    var matched = _.some(sections, function (section) {
      var matches = section.match(/(get|post|put|delete|head|options|trace|connect)(?:\s*\[\s*([^\]].*?)\s*\]\s*)?/i);
      if (matches) {
        var innerMethod = matches[1];
        var innerParams = matches[2];

        if (innerMethod && innerMethod.toLowerCase() === method) {
          if (!innerParams || checkParams(innerParams, params)) {
            return true;
          }
        }
      }
    });

    if (matched) {
      result = options;
    }

    return matched;
  });

  return specified ? result : methods['*'];
}

function checkParams(paramStr, params) {

  var parts = paramStr.split(/\s*,\s*/g);

  return _.every(parts, function (part) {

    var kv = part.split(/\s*=\s*/g);
    var key = kv[0];
    var value = kv[1];

    if (_.has(params, key)) {
      // =>
      //   get[param]
      //   get[param=value]
      return kv.length === 1 || value === params[key];
    }
  });
}

function compile(tpl, params, options) {
  var ret = mockJSON.compile(tpl, params, options.placeholders);
  return options.dataShift ? ret.data : ret;
}

function Router(options) {

  this.debug = options.debug;
  this.delay = options.delay || 0;
  this.timeout = options.timeout || 0;
  this.cookies = options.cookies;
  this.placeholders = options.placeholders;

  this.sensitive = options.sensitive;
  this.strict = options.strict;
  this.end = options.end;

  this.stack = [];

  this.add(options.rules);
}

Router.prototype.add = function (rules) {

  var stack = this.stack;
  var delay = this.delay;
  var timeout = this.timeout;
  var cookies = this.cookies;
  var placeholders = this.placeholders;

  var rData = /(data)\|(?:([\+-]\d+)|(\d+-?\d*)?(?:\.(\d+-?\d*))?)/;
  var uriOptions = {
    sensitive: this.sensitive,
    strict: this.strict,
    end: this.end
  };


  if ('string' === typeof rules) {
    var uri = rules;
    rules = {};
    rules[uri] = {
      '*': {
        data: {}
      }
    };
  }

  rules = rules || {};

  _.forEach(rules, function (rule, uri) {

    var layer = new Layer(uri, uriOptions);

    _.forEach(rule, function (options, method) {

      // mock data is an array:
      //   path/to/api: {
      //       get: {
      //         'data|1-10':[
      //             ...
      //          ]
      //       }
      //   }
      if (!options.data) {
        _.some(options, function (option, key) {
          if (rData.test(key)) {
            options.data = {};
            options.data[key] = option;
            options.dataShift = true;
            return true;
          }
        });

        options.data = options.data || {};
      }


      options.delay = parseInt(options.delay || delay, 10) || 0;
      options.timeout = options.timeout || timeout;
      options.placeholders = _.merge({}, placeholders, options.placeholders);

      // merge cookies
      if (options.cookies && cookies) {
        options.cookies = _.merge({}, cookies, options.cookies);
      } else {
        options.cookies = options.cookies || cookies;
      }

      // method：
      // get         match get
      // get|post    match get or post
      // *           match all
      // get[param1=value1]
      // get[param1=value1, param2=value2 ...]
      // get|post[param1=value]|get[param2=value]
      layer.methods[method] = options;

    });

    stack.push(layer);
  });
};

Router.prototype.handle = function (req, res, next) {

  var url = parseUrl(req);
  var method = req.method.toLowerCase();
  var handled = _.some(this.stack, function (layer) {

    var methods = layer.methods;
    var strict = _.has(methods, method); // just for speed up

    if (layer.match(url.pathname)) {

      // query params, request body, restful param
      req.params = _.merge(req.params, layer.params);

      var options = strict
        ? methods[method]
        : getOptions(methods, method, req.params);

      if (!options) {
        return false;
      }

      options = _.merge({}, options);

      // statusCode
      if (options.statusCode && options.statusCode !== 200) {
        options.statusCode = parseInt(options.statusCode, 10);
        if (isNaN(options.statusCode)) {
          options.statusCode = 200;
        }
      } else {
        options.statusCode = 200;
      }

      // handle response
      if (options.statusCode >= 400) {
        handleStatusCode(req, res, options.statusCode, next);
      } else if (options.timeout === true || options.timeout > 0) {
        handleTimeout(req, res, options.timeout, next);
      } else {
        if (options.delay) {
          setTimeout(function () {
            handle(req, res, options, next);
          }, options.delay);
        } else {
          handle(req, res, options, next);
        }
      }

      return true;
    }
  });

  if (!handled) {
    handle404(req, res, next);
  }

  return handled;
};


module.exports = Router;


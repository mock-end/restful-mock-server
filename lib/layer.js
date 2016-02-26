var pathRegexp = require('path-to-regexp');

function Layer(path, options) {

  if (!(this instanceof Layer)) {
    return new Layer(path, options);
  }

  this.keys = [];
  this.regexp = pathRegexp(path, this.keys, options || {});
  this.methods = {};
}

/**
 * Check if this route matches `path`, if so populate `.params`.
 *
 * @param {String} path
 * @return {Boolean}
 */

Layer.prototype.match = function (path) {

  var counter = 0;
  var keys = this.keys;
  var params = this.params = {};
  var matches = this.regexp.exec(path);

  if (!matches) {
    return false;
  }

  this.path = matches[0];

  for (var i = 1, l = matches.length; i < l; ++i) {

    var key = keys[i - 1];
    var val;

    try {

      val = 'string' === typeof matches[i]
        ? decodeURIComponent(matches[i])
        : matches[i];

    } catch (e) {
      var err = new Error("Failed to decode param '" + matches[i] + "'");
      err.status = 400;
      throw err;
    }

    if (key) {
      params[key.name] = val;
    } else {
      params[counter++] = val;
    }
  }

  return true;
};

module.exports = Layer;

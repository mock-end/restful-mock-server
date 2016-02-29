var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');

function getAbsolutePath(filepath) {
  return path.isAbsolute(filepath)
    ? filepath
    : path.join(process.cwd(), filepath);
}

function isFileExist(file) {

  var filepath = getAbsolutePath(file);

  if (!fs.existsSync(filepath)) {
    throw new Error('File: "' + file + '" doesn\'t exist.');
  }

  return true;
}

function readFile(filepath) {
  return fs.readFileSync(filepath, { encoding: 'utf8' });
}

function getValidFiles(files, tryJSON) {

  var result = [];

  if (files) {

    if (!_.isArray(files)) {
      files = [files];
    }

    _.forEach(files, function (file) {
      if (_.isString(file)) {
        if (tryJSON) {
          try {
            JSON.parse(file);
          } catch (e) {
            if (fs.existsSync(file)) {
              result.push(getAbsolutePath(file));
            }
          }
        } else {
          if (fs.existsSync(file)) {
            result.push(getAbsolutePath(file));
          }
        }
      }
    });
  }

  return result;


}

exports.readCerts = function (file) {

  var filepath = getAbsolutePath(path.join('certs', file));
  if (isFileExist(filepath, file)) {
    return readFile(filepath);
  }
};

exports.importRules = function (file) {

  if (isFileExist(file)) {

    var filepath = getAbsolutePath(file);
    var ext = path.extname(filepath);

    // YAML
    if (ext.match(/ya?ml/)) {
      var res = readFile(filepath);
      return yaml.safeLoad(res);
    }

    // JS / JSON / CoffeeScript
    if (ext.match(/json|js|coffee|ls/)) {

      if (require.cache[filepath]) {
        delete require.cache[filepath];
      }

      return require(filepath);
    }

    // unknown
    throw new Error('File: "' + file + '" is an unsupported filetype.');
  }
};

exports.getWatchedFiles = function (rules, watch) {

  var result = [];


  // watch the rule files by default
  if (rules) {
    result = getValidFiles(rules, true);
  }

  if (watch && watch !== true) {
    result.concat(getValidFiles(watch));
  }

  return result;
};

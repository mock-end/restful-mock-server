var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');

function getAbsolutePath(filepath) {
  return path.isAbsolute(filepath)
    ? filepath
    : path.join(process.cwd(), filepath);
}

function isFileExist(filepath, filename) {

  if (!fs.existsSync(filepath)) {
    throw new Error('File: "' + filename || filepath + '" doesn\'t exist.');
  }

  return true;
}

function readFile(filepath) {
  return fs.readFileSync(filepath, { encoding: 'utf8' });
}

exports.readCerts = function (file) {

  var filepath = getAbsolutePath(path.join('certs', file));
  if (isFileExist(filepath, file)) {
    return readFile(filepath);
  }
};

exports.importRules = function (file) {

  var filepath = getAbsolutePath(file);
  if (isFileExist(filepath, file)) {

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

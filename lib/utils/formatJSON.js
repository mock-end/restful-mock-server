var _ = require('lodash');

function endWith(str, end) {
  var index = str.length - end.length;
  return index >= 0 && str.indexOf(end, index) === index;
}

module.exports = function formatJson(obj, space, level) {

  if (!obj) {
    return;
  }

  if (typeof space === 'undefined') {
    space = '';
  }

  if (typeof level === 'undefined') {
    level = 0;
  }

  var indent = '    ';
  var isArr = _.isArray(obj);
  var ret = '';
  var val;

  for (var key in obj) {

    if (isArr) {
      ret += space + indent;
    } else {
      ret += space + indent + key + ': ';
    }

    val = obj[key];

    if (val instanceof Date) {
      val = val.toString();
    }

    if (_.isArray(val) || _.isObject(val)) {
      ret += formatJson(val, space + indent, level + 1);
    } else {

      if (typeof val === 'string') {
        val = '"' + val + '"';
      }

      ret += val + ',\n';
    }
  }

  if (key && endWith(ret, ',\n')) {
    ret = ret.substr(0, ret.length - 2) + '\n';
  }

  if (isArr) {
    ret = (level > 0 ? '' : space) + '[\n' + ret + space + ']' + (level > 0 ? ',\n' : '');
  } else {
    ret = (level > 0 ? '' : space) + '{\n' + ret + space + '}' + (level > 0 ? ',\n' : '');
  }

  return ret;
};

var fs = require('fs');
var path = require('path');


function help(item) {

  if (!item || item === true) {
    item = 'help';
  }

  try {

    var filepath = path.join(__dirname, '..', '..', 'doc', 'console', item + '.txt');
    return fs.readFileSync(filepath, 'utf8');

  } catch (e) {

    return '"' + item + '" help can\'t be found.\n';

  }
}


module.exports = help;

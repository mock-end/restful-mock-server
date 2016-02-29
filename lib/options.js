module.exports = {
  // server
  // ------
  server: null,
  protocol: 'http',
  port: '9000',
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
  watch: true,        // array of watched files or boolean
  placeholders: {},

  // global mock options
  // -------------------
  delay: 0,           // ms，mock network delay
  timeout: false,     //
  statusCode: 200,    // http(s)'s status code

  // path-to-regexp
  // ref: https://www.npmjs.com/package/path-to-regexp
  sensitive: false,   // When true the route will be case sensitive. (default: false)
  strict: false,      // When false the trailing slash is optional. (default: false)
  end: true,          // When false the path will match at the beginning. (default: true)

  // logger
  // ------
  debug: true,
  verbose: false,
  silent: false       // disable any logs
};

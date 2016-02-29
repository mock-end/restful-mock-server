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

  sensitive: false,   // 当设置为 true, 将区分路由的大小写
  strict: false,      // 当设置为 true, 路由末尾的斜杠将影响匹配
  end: true,          // 当设置为 false, 将只会匹配 url 前缀

  // logger
  // ------
  debug: true,
  verbose: true,
  silent: false       // disable any logs
};

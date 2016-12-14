'use strict';

module.exports = function () {
  let index = 0;
  return {
    log: console.log,
    boolean: function (string) {
      if (string == null) {
        return false;
      }
      string += '';
      switch (string.toLowerCase().trim()) {
        case "true":
        case "yes":
        case "1":
          return true;
        default:
          return false;
      }
    },
    request: function (url, options, data) {
      let localIndex = index++;

      url = require('url').parse(url);

      let request = {
        protocol: url.protocol,
        port: url.port,
        hostname: url.hostname,
        method: options.method || 'GET',
        headers: options.headers || {},
        path: url.path
      };

      this.log('HTTP REQUEST [' + localIndex + '] ' + JSON.stringify(request));

      return new Promise((resolve, reject) => {
        const lib = request.protocol === 'https' ? require('https') : require('http');
        const req = lib.request(request, (response) => {
          const body = [];
          response.on('data', (chunk) => body.push(chunk));
          response.on('end', () => {
            let rspBody = body.join('');
            this.log('HTTP RESPONSE [' + localIndex + '] ' + response.statusCode);
            if (response.statusCode < 200 || response.statusCode > 299) {
              reject(new Error('[' + response.statusCode + ']: ' + rspBody));
            } else {
              resolve(rspBody)
            }
          });
        });
        req.on('error', (err) => reject(err));
        if (data) {
          req.write(data);
        }
        req.end();
      })
    }
  };
};

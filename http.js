'use strict';

let logger = require('./log')();

module.exports = function () {
  let index = 0;
  return {
    get: function (url, options) {
      options = options || {};
      options.method = 'GET';
      return this.request(url, options);
    },
    request: function (url, options, data) {
      let localIndex = index++;
      options = options || {};
      url = require('url').parse(url);

      let request = {
        protocol: url.protocol,
        port: url.port || (url.protocol.startsWith('https') ? "443" : "80"),
        hostname: url.hostname,
        method: options.method || 'GET',
        headers: options.headers || {},
        path: url.path
      };

      logger.log('HTTP REQUEST [' + localIndex + '] ' + JSON.stringify(request));

      return new Promise((resolve, reject) => {
        const tls = request.protocol.startsWith('https');
        const lib = tls ? require('https') : require('http');
        if (tls) {
          request.rejectUnauthorized = require('./util')().boolean(process.env.VAMP_TLS_CHECK || true);
          if (request.rejectUnauthorized && process.env.VAMP_CA) {
            request.ca = require('fs').readFileSync(process.env.VAMP_CA);
          }
        }
        const req = lib.request(request, (response) => {
          const body = [];
          response.on('data', (chunk) => body.push(chunk));
          response.on('end', () => {
            let rspBody = body.join('');
            logger.log('HTTP RESPONSE [' + localIndex + '] ' + response.statusCode);
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

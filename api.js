'use strict';

let _ = require('highland');
let request = require('request-promise');

let http = request.defaults({
  headers: {'Accept': 'application/json', 'Content-Type': 'application/json'}
});

module.exports = function (opts) {
  opts = opts || {};
  opts.host = opts.host || process.env.VAMP_URL || 'http://127.0.0.1';
  opts.path = opts.path || '/api/v1';

  let cache = {};

  return {
    log: console.log,
    url: opts.host + opts.path,
    get: function (api, force) {
      api = api.charAt(0) === '/' ? api : '/' + api;
      if (!cache[api] || force) {
        this.log('API GET ' + api);

        let self = this;
        let end = false;
        let current = 1;

        cache[api] = _(function (push, next) {
          if (!end) {
            push(null, current++);
            next();
          } else push(null, _.nil);
        }).flatMap(function (page) {
          return _(http(self.url + api + '?page=' + (page++)).promise().then(JSON.parse)).flatMap(function (response) {
            if (response.constructor === Array) {
              if (response.length == 0) end = true;
              return _(response);
            } else {
              end = true;
              return _([response]);
            }
          });
        });
      } else {
        this.log('API GET ' + api + ' [CACHED]');
      }
      return cache[api].fork();
    },
    put: function (api, json) {
      api = api.charAt(0) === '/' ? api : '/' + api;
      delete cache[api];
      this.log('API PUT ' + api);
      return _(http({
        url: this.url + api,
        method: 'PUT',
        json: json
      }).promise());
    },
    delete: function (api, json) {
      api = api.charAt(0) === '/' ? api : '/' + api;
      delete cache[api];
      this.log('API DELETE ' + api);
      return _(http({
        url: this.url + api,
        method: 'DELETE',
        json: json || {}
      }).promise());
    },
    namify: function (artifacts) {
      let result = [];
      for (let name in artifacts) {
        if (!artifacts.hasOwnProperty(name)) continue;
        let artifact = artifacts[name];
        artifact['name'] = name;
        result.push(artifact);
      }
      return _(result);
    },
    info: function (force) {
      return this.get('info', force);
    },
    config: function (force) {
      return this.get('config', force);
    },
    gateways: function (force) {
      return this.get('gateways', force);
    },
    deployments: function (force) {
      return this.get('deployments', force);
    },
    event: function (tags, value, type) {
      let $this = this;
      if (!type) type = 'event';
      this.log('API PUT /events ' + JSON.stringify({tags: tags, type: type}));
      return _(http.post({url: $this.url + '/events', json: {tags: tags, value: value, type: type}}).promise());
    }
  };
};

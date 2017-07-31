'use strict';

let _ = require('highland');
let logger = require('./log')();
let util = require('./util')();
let http = require('./http')();

module.exports = function (opts) {
  opts = opts || {};
  opts.host = opts.host || process.env.VAMP_URL || 'http://127.0.0.1';
  opts.path = opts.path || '/api/v1';
  opts.cache = util.boolean(opts.cache || process.env.VAMP_API_CACHE || true);
  opts.token = opts.token || process.env.VAMP_API_TOKEN || '';
  opts.namespace = opts.namespace || process.env.VAMP_NAMESPACE || '';
  opts.headers = opts.headers || {'Authorization': opts.token ? 'token ' + opts.token : 'token', 'Accept': 'application/json', 'Content-Type': 'application/json'};

  logger.log('API options: ' + JSON.stringify(opts));

  let cachedValues = {};
  let cachedStreams = {};

  return {
    url: opts.host + (opts.namespace ? '/' + encodeURIComponent(opts.namespace) : '') + opts.path,
    get: function (api, force, qs) {
      api = api.charAt(0) === '/' ? api : '/' + api;
      qs = qs ? '&' + qs : '';

      let allowCache = opts.cache && !force;

      if (cachedValues[api] && allowCache) {
        logger.log('API GET ' + api + ' [CACHED]');
        return _([cachedValues[api]]);
      }

      if (!cachedStreams[api] || !allowCache) {
        logger.log('API GET ' + api);

        let self = this;
        let end = false;
        let current = 1;

        cachedStreams[api] = _(function (push, next) {
          if (!end) {
            push(null, current++);
            next();
          } else push(null, _.nil);
        }).flatMap(function (page) {
          return _(http.get(self.url + api + '?page=' + (page++) + qs, {headers: opts.headers}).then(JSON.parse)).flatMap(function (response) {
            if (response.constructor === Array) {
              if (response.length === 0) end = true;
              return _(response);
            } else {
              end = true;
              return _([response]);
            }
          });
        });
      } else {
        logger.log('API GET ' + api + ' [CACHED]');
      }
      return cachedStreams[api].fork().tap(function (value) {
        cachedValues[api] = value;
      });
    },
    put: function (api, json) {
      api = api.charAt(0) === '/' ? api : '/' + api;
      delete cachedValues[api];
      delete cachedStreams[api];
      logger.log('API PUT ' + api);
      return _(http.request(this.url + api, {
        method: 'PUT',
        headers: opts.headers
      }, JSON.stringify(json)));
    },
    post: function (api, json) {
      api = api.charAt(0) === '/' ? api : '/' + api;
      delete cachedValues[api];
      delete cachedStreams[api];
      logger.log('API POST ' + api);
      return _(http.request(this.url + api, {
        method: 'POST',
        headers: opts.headers
      }, JSON.stringify(json)));
    },
    delete: function (api, json) {
      api = api.charAt(0) === '/' ? api : '/' + api;
      delete cachedValues[api];
      delete cachedStreams[api];
      logger.log('API DELETE ' + api);
      return _(http.request(this.url + api, {
        method: 'DELETE',
        headers: opts.headers
      }, json ? JSON.stringify(json) : ''));
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
      return this.get('config', force, 'flatten=true');
    },
    gateways: function (force) {
      return this.get('gateways', force);
    },
    deployments: function (force) {
      return this.get('deployments', force);
    },
    event: function (tags, value, type) {
      if (!type) type = 'event';
      logger.log('API PUT /events ' + JSON.stringify({tags: tags, type: type}));
      return _(this.post('/events', {tags: tags, value: value, type: type}));
    }
  };
};

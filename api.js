'use strict';

var _ = require('highland');
var request = require('request-promise');

var http = request.defaults({
  headers: {'Accept': 'application/json', 'Content-Type': 'application/json'}
});

var Api = function (opts) {
  opts = opts || {};
  opts.host = opts.host || process.env.VAMP_URL || 'http://127.0.0.1';
  opts.path = opts.path || '/api/v1';

  this.url = opts.host + opts.path;

  this.get = function (api) {
    api = api.charAt(0) === '/' ? api : '/' + api;
    this.log("API GET " + api);

    var self = this;
    var end = false;
    var current = 1;
    return _(function (push, next) {
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
  };

  this.put = function (api, json) {
    api = api.charAt(0) === '/' ? api : '/' + api;
    this.log("API PUT " + api);
    return _(http({
      url: this.url + api,
      method: 'PUT',
      json: json
    }).promise());
  };

  this.delete = function (api, json) {
    api = api.charAt(0) === '/' ? api : '/' + api;
    this.log("API DELETE " + api);
    return _(http({
      url: this.url + api,
      method: 'DELETE',
      json: json || {}
    }).promise());
  };

  this.namify = function (artifacts) {
    var result = [];
    for (var name in artifacts) {
      if (!artifacts.hasOwnProperty(name)) continue;
      var artifact = artifacts[name];
      artifact['name'] = name;
      result.push(artifact);
    }
    return _(result);
  };

  this.log = console.log;
};

Api.prototype.info = function () {
  return this.get('info');
};

Api.prototype.config = function () {
  return this.get('config');
};

Api.prototype.gateways = function () {
  return this.get('gateways');
};

Api.prototype.deployments = function () {
  return this.get('deployments');
};

Api.prototype.event = function (tags, value, type) {
  if (!type) type = "event";
  this.log("API PUT /events " + JSON.stringify({tags: tags, type: type}));
  return _(http.post({url: this.url + '/events', json: {tags: tags, value: value, type: type}}).promise());
};

module.exports = Api;

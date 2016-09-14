'use strict';

var _ = require('highland');
var request = require('request-promise');

var http = request.defaults({
  headers: {'Accept': 'application/json', 'Content-Type': 'application/json'}
});

var Api = function (opts) {

  opts = opts || {};

  if (!opts.host) {
    opts.host = (process.env.VAMP_URL || 'http://127.0.0.1');
  }

  if (!opts.path) {
    opts.path = '/api/v1';
  }

  this.url = opts.host + opts.path + '/';

  this.api = function (api) {
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
};

Api.prototype.info = function () {
  return this.api('info');
};

Api.prototype.config = function () {
  return this.api('config');
};

Api.prototype.gateways = function () {
  return this.api('gateways');
};

Api.prototype.deployments = function () {
  return this.api('deployments');
};

Api.prototype.event = function (tags, value, type) {
  if (!type) type = "event";
  return _(http.post({url: this.url + 'events', json: {tags: tags, value: value, type: type}}).promise());
};

module.exports = Api;
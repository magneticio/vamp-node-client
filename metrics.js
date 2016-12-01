'use strict';

var metrics_backend_name = process.env.VAMP_METRICS_BACKEND || 'elasticsearch'

var _ = require('highland');
var metrics_backend = require('./backends/' + metrics_backend_name);

_.log('Using metrics implementation ' + metrics_backend_name)

var Metrics = function (api) {
  this.api = api;
};

Metrics.prototype.count = function (query_options) {
  var $this = this;
  return this.api.config().flatMap(metrics_backend($this, query_options).count);
};

Metrics.prototype.average = function (query_options) {
  var $this = this;
  return this.api.config().flatMap(metrics_backend($this, query_options).average);
};

module.exports = Metrics;

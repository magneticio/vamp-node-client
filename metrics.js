'use strict';

var metrics_backend_name = process.env.VAMP_METRICS_BACKEND || 'elasticsearch'

var _ = require('highland');
var metrics_backend = require('./backends/' + metrics_backend_name);

_.log('Using metrics implementation ' + metrics_backend_name)

var Metrics = function (api) {
  this.api = api;
};

Metrics.prototype.count = function (term, onrange, seconds) {
  var $this = this;
  return this.api.config().flatMap(metrics_backend($this, term, onrange, seconds).count);
};

Metrics.prototype.average = function (term, onrange, seconds) {
  var $this = this;
  return this.api.config().flatMap(metrics_backend($this, term, onrange, seconds).average);
};

module.exports = Metrics;

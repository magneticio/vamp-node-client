'use strict';

var _ = require('highland');
var elasticsearch = require('elasticsearch');

var Metrics = function (api) {
  this.api = api;
};

Metrics.prototype.count = function (term, range, seconds) {

  return this.api.config().flatMap(function (config) {

    var esClient = new elasticsearch.Client({
      host: config['vamp.pulse.elasticsearch.url'],
      log: 'error'
    });

    return _(esClient.search({
      index: config['vamp.gateway-driver.logstash.index'],
      type: 'haproxy',
      body: {
        query: {
          filtered: {
            query: {
              match_all: {}
            },
            filter: {
              bool: {
                must: [
                  {
                    term: term
                  },
                  {
                    range: range
                  },
                  {
                    range: {
                      "@timestamp": {
                        gt: "now-" + seconds + "s"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        size: 0
      }
    })).map(function (response) {
      return response.hits.total;
    });
  });
};

Metrics.prototype.average = function (term, on, seconds) {

  return this.api.config().flatMap(function (config) {

    var esClient = new elasticsearch.Client({
      host: config['vamp.pulse.elasticsearch.url'],
      log: 'error'
    });

    return _(esClient.search({
      index: config['vamp.gateway-driver.logstash.index'],
      type: 'haproxy',
      body: {
        query: {
          filtered: {
            query: {
              match_all: {}
            },
            filter: {
              bool: {
                must: [
                  {
                    term: term
                  },
                  {
                    range: {
                      "@timestamp": {
                        gt: "now-" + seconds + "s"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        aggregations: {
          agg: {
            avg: {
              field: on
            }
          }
        },
        size: 0
      }
    })).map(function (response) {
      var total = response.hits.total;
      return {
        total: total,
        rate: Math.round(total / seconds * 100) / 100,
        average: Math.round(response.aggregations.agg.value * 100) / 100
      };
    });
  });
};

module.exports = Metrics;
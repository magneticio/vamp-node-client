'use strict';

var _ = require('highland');
var elasticsearch = require('elasticsearch');

module.exports = function($this, term, onrange, seconds) {
    return {
        count: function (config) {
          var elasticsearchendpoint = process.env.VAMP_METRICS_ENDPOINT || config['vamp.pulse.elasticsearch.url'];
          // TODO: error when unable to connect with ES
          var esClient = new elasticsearch.Client({
            host: elasticsearchendpoint,
            log: 'error'
          });
          $this.api.log('ELASTICSEARCH COUNT ' + JSON.stringify({term: term, range: onrange, seconds: seconds}));
          return _(esClient.search({
            index: config['vamp.gateway-driver.elasticsearch.metrics.index'],
            type: config['vamp.gateway-driver.elasticsearch.metrics.type'],
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
      },
      average: function (config) {
        var elasticsearchendpoint = process.env.VAMP_METRICS_ENDPOINT || config['vamp.pulse.elasticsearch.url'];
        var esClient = new elasticsearch.Client({
          host: elasticsearchendpoint,
          log: 'error'
        });
        $this.api.log('ELASTICSEARCH AVERAGE ' + JSON.stringify({term: term, on: onrange, seconds: seconds}));
        return _(esClient.search({
          index: config['vamp.gateway-driver.elasticsearch.metrics.index'],
          type: config['vamp.gateway-driver.elasticsearch.metrics.type'],
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
                  field: onrange
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
      }
    };
}

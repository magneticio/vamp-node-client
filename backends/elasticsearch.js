'use strict';

var _ = require('highland');
var elasticsearch = require('elasticsearch');

module.exports = function($this, query_options) {
    // Help:
    // var query_options = {term: {ft:gateway.lookup_name}, on: 'Tt', seconds: 300};
    var term = query_options.term;
    var seconds = query_options.seconds;
    var on = query_options.on || '';
    var range = query_options.range || '';

    return {
        count: function (config) {
          var elasticsearchendpoint = process.env.VAMP_METRICS_ENDPOINT || config['vamp.pulse.elasticsearch.url'];
          // TODO: error when unable to connect with ES
          var esClient = new elasticsearch.Client({
            host: elasticsearchendpoint,
            log: 'error'
          });
          $this.api.log('ELASTICSEARCH COUNT ' + JSON.stringify({term: term, range: range, seconds: seconds}));
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
        $this.api.log('ELASTICSEARCH AVERAGE ' + JSON.stringify({term: term, on: on, seconds: seconds}));
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
      }
    };
}

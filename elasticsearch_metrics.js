'use strict';

let _ = require('highland');
let elasticsearch = require('elasticsearch');

module.exports = function (api) {
  this.api = api;
  let $this = this;

  this.query = function (config, term, seconds) {
    return {
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
        size: 0
      }
    }
  };

  return {
    count: function (term, range, seconds) {
      return $this.api.config().flatMap(function (config) {

        let esClient = new elasticsearch.Client({
          host: config['vamp.pulse.elasticsearch.url'],
          log: 'error'
        });

        $this.api.log('ELASTICSEARCH COUNT ' + JSON.stringify({term: term, range: range, seconds: seconds}));

        let query = $this.query(config, term, seconds);
        query.body.query.filtered.filter.bool.must.push({range: range});

        return _(esClient.search(query)).map(function (response) {
          return response.hits.total;
        });
      })
    },
    average: function (term, on, seconds) {
      return $this.api.config().flatMap(function (config) {

        let esClient = new elasticsearch.Client({
          host: config['vamp.pulse.elasticsearch.url'],
          log: 'error'
        });

        $this.api.log('ELASTICSEARCH AVERAGE ' + JSON.stringify({term: term, on: on, seconds: seconds}));

        let query = $this.query(config, term, seconds);
        query.body.aggregations = {
          agg: {
            avg: {
              field: on
            }
          }
        };

        return _(esClient.search(query)).map(function (response) {
          let total = response.hits.total;
          return {
            total: total,
            rate: Math.round(total / seconds * 100) / 100,
            average: Math.round(response.aggregations.agg.value * 100) / 100
          };
        });
      });
    }
  }
};

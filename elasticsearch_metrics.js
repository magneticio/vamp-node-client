'use strict';

let _ = require('highland');
let logger = require('./log')();
let http = require('./http')();

module.exports = function (api) {
  let $this = this;

  this.config = function () {
    if (process.env.VAMP_PULSE_ELASTICSEARCH_URL) {
      let config = {};
      config['vamp.pulse.elasticsearch.url'] = process.env.VAMP_PULSE_ELASTICSEARCH_URL;
      config['vamp.gateway-driver.elasticsearch.metrics.type'] = process.env.VAMP_GATEWAY_DRIVER_ELASTICSEARCH_METRICS_TYPE;
      config['vamp.gateway-driver.elasticsearch.metrics.index'] = process.env.VAMP_GATEWAY_DRIVER_ELASTICSEARCH_METRICS_INDEX;
      return _([config]);
    }
    return api.config();
  };

  this.query = function (config, term, seconds) {
    return {
      index: config['vamp.gateway-driver.elasticsearch.metrics.index'],
      type: config['vamp.gateway-driver.elasticsearch.metrics.type'],
      body: {
        query: {
          bool: {
            filter: [
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
        },
        size: 0
      }
    }
  };

  return {
    count: function (term, range, seconds) {
      return $this.config().flatMap(function (config) {
        logger.log('ELASTICSEARCH COUNT ' + JSON.stringify({term: term, range: range, seconds: seconds}));

        let url = config['vamp.pulse.elasticsearch.url'];
        let query = $this.query(config, term, seconds);
        query.body.query.bool.filter.push({range: range});
        url += '/' + query.index + '/' + query.type + '/_search';

        return _(http.request(url, {method: 'POST'}, JSON.stringify(query.body))).map(function (response) {
          response = JSON.parse(response);
          return response.hits.total;
        });
      })
    },
    average: function (term, on, seconds) {
      return $this.config().flatMap(function (config) {
        logger.log('ELASTICSEARCH AVERAGE ' + JSON.stringify({term: term, on: on, seconds: seconds}));

        let url = config['vamp.pulse.elasticsearch.url'];
        let query = $this.query(config, term, seconds);
        query.body.aggregations = {
          agg: {
            avg: {
              field: on
            }
          }
        };
        url += '/' + query.index + '/' + query.type + '/_search';

        return _(http.request(url, {method: 'POST'}, JSON.stringify(query.body))).map(function (response) {
          response = JSON.parse(response);
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

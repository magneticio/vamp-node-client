'use strict';

let _ = require('highland');
let dateFormat = require('date-fns/format');
let logger = require('./log')();
let http = require('./http')();

module.exports = function (api) {
  let $this = this;

  let elasticsearchVersion = '';

  let queryParam1 = 'bool';
  let queryParam2 = 'must';

  this.config = function () {
    let configuration;
    if (process.env.VAMP_PULSE_ELASTICSEARCH_URL) {
      let config = {};
      config['vamp.pulse.elasticsearch.url'] = process.env.VAMP_PULSE_ELASTICSEARCH_URL;
      config['vamp.gateway-driver.elasticsearch.metrics.type'] = process.env.VAMP_GATEWAY_DRIVER_ELASTICSEARCH_METRICS_TYPE;
      config['vamp.gateway-driver.elasticsearch.metrics.index'] = process.env.VAMP_GATEWAY_DRIVER_ELASTICSEARCH_METRICS_INDEX;
      configuration = _([config]);
    } else {
      configuration = api.config();
    }

    if (!elasticsearchVersion) {
      let cfg;
      return configuration.flatMap((data) => {
        cfg = data;
        return _(http.get(data['vamp.pulse.elasticsearch.url']).then(JSON.parse)).map((es) => {
          elasticsearchVersion = Number(es.version.number.substr(0, es.version.number.indexOf('.')));
          if (elasticsearchVersion < 5) {
            queryParam1 = 'filtered';
            queryParam2 = 'query';
          }
          return cfg;
        });
      });
    }

    return configuration;
  };

  this.query = function (config, term, seconds) {
    const query = {
      index: config['vamp.gateway-driver.elasticsearch.metrics.index'],
      type: config['vamp.gateway-driver.elasticsearch.metrics.type'],
      body: {
        size: 0,
        query: {}
      }
    };
    query.body.query[queryParam1] = {
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
    };
    query.body.query[queryParam1][queryParam2] = { match_all: {} };
    return query;
  };

  this.normalizeEvent = function (tags, value, type) {
    tags = tags || [];
    const expandedTags = new Set();
    tags.forEach(function (tag) {
      expandedTags.add(tag);
      let index = tag.indexOf(':');
      if (index > -1) {
        expandedTags.add(tag.substr(0, index));
      }
    });
    let body = {
      tags: Array.from(expandedTags),
      value: JSON.stringify(value),
      type: type,
      timestamp: new Date().toISOString()
    };
    body[type] = value;
    return body;
  };

  return {
    event: function (tags, value, type) {
      return $this.config().flatMap(function (config) {
        logger.log('ELASTICSEARCH EVENT ' + JSON.stringify({tags: tags}));

        let url = config['vamp.pulse.elasticsearch.url'];
        let path = process.env.VAMP_ELASTICSEARCH_EVENT_INDEX || '';
        if (!path) throw 'no index/type';

        let index1 = path.indexOf('{');
        let index2 = path.indexOf('}', index1);

        if (index1 > -1 && index2 > -1) {
          let part1 = path.substr(0, index1);
          let part2 = path.substr(index1 + 1, index2 - index1 - 1).replace('dd', 'DD');
          let part3 = path.substr(index2 + 1);
          path = part1 + dateFormat(new Date(), part2) + part3;
        }
        url += url.endsWith('/') ? path : '/' + path;
        const body = JSON.stringify($this.normalizeEvent(tags, value, type));
        return _(http.request(url, {method: 'POST', headers: {'Content-Type': 'application/json'}}, body));
      });
    },
    count: function (term, range, seconds) {
      return $this.config().flatMap(function (config) {
        logger.log('ELASTICSEARCH COUNT ' + JSON.stringify({term: term, range: range, seconds: seconds}));

        let url = config['vamp.pulse.elasticsearch.url'];
        let query = $this.query(config, term, seconds);
        query.body.query[queryParam1].filter.bool.must.push({range: range});
        url += '/' + query.index + '/' + query.type + '/_search';

        return _(http.request(url, {method: 'POST', headers: {'Content-Type': 'application/json'}}, JSON.stringify(query.body))).map(function (response) {
          response = JSON.parse(response);
          return response.hits.total;
        });
      });
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

        return _(http.request(url, {method: 'POST', headers: {'Content-Type': 'application/json'}}, JSON.stringify(query.body))).map(function (response) {
          response = JSON.parse(response);
          let total = response.hits.total;
          return {
            total: total,
            rate: Math.round(total / seconds * 100) / 100,
            average: Math.round(response.aggregations ? response.aggregations.agg.value * 100 : 0) / 100
          };
        });
      });
    }
  }
};

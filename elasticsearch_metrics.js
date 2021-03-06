'use strict';

let _ = require('highland');
let dateFormat = require('date-fns/format');
let logger = require('./log')();
let elasticSearchClientFactory = require('./elasticsearch_client_factory');

module.exports = function(api, options) {
  let $this = this;

  options = options || {};

  const elasticSearchConfig = {
    url: process.env.VAMP_PULSE_ELASTICSEARCH_URL || api.config()['vamp.pulse.elasticsearch.url'],
    apiVersion: process.env.VAMP_PULSE_ELASTICSEARCH_API_VERSION || api.config()['vamp.pulse.elasticsearch.api.version'],
    caCertPath: process.env.VAMP_PULSE_ELASTICSEARCH_CA_CERT_PATH || api.config()['vamp.pulse.elasticsearch.ca-cert.path'],
    clientCertPath: process.env.VAMP_PULSE_ELASTICSEARCH_CLIENT_CERT_PATH || api.config()['vamp.pulse.elasticsearch.client-cert.path'],
    clientCertKeyPath: process.env.VAMP_PULSE_ELASTICSEARCH_CLIENT_CERT_KEY_PATH || api.config()['vamp.pulse.elasticsearch.client-cert.key.path'],
    clientCertKeyPassword: process.env.VAMP_PULSE_ELASTICSEARCH_CLIENT_CERT_KEY_PASSWORD || api.config()['vamp.pulse.elasticsearch.client-cert.key.password'],
    metricsType: process.env.VAMP_GATEWAY_DRIVER_ELASTICSEARCH_METRICS_TYPE || api.config()['vamp.gateway-driver.elasticsearch.metrics.type'],
    metricsIndex: process.env.VAMP_GATEWAY_DRIVER_ELASTICSEARCH_METRICS_INDEX || api.config()['vamp.gateway-driver.elasticsearch.metrics.index'],
    eventIndex: options.vamp_elasticsearch_event_index || process.env.VAMP_ELASTICSEARCH_EVENT_INDEX,
    eventV2Index: options.vamp_elasticsearch_event_v2_index || process.env.VAMP_ELASTICSEARCH_EVENT_V2_INDEX
  }

  const elasticSearchClient = elasticSearchClientFactory.create(elasticSearchConfig);

  this.query = function(filters, seconds) {
    let q = {
      index: elasticSearchConfig.metricsIndex,
      type: elasticSearchConfig.metricsType,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [{
              range: {
                "@timestamp": {
                  gt: "now-" + seconds + "s"
                }
              }
            }]
          }
        }
      }
    };

    filters.forEach(f => {
      q.body.query.bool.filter.push(f)
    });
    return q;
  };

  this.searchQuery = function(index, term, seconds, size) {
    return {
      index: index,
      body: {
        size: size,
        query: {
          bool: {
            filter: [{
                term: term
              },
              {
                range: {
                  "timestamp": {
                    gt: "now-" + seconds + "s"
                  }
                }
              }
            ]
          }
        }
      }
    };
  };

  this.normalizeEvent = function(tags, value, type, salt, stringifyValue) {
    tags = tags || [];
    const expandedTags = new Set();
    tags.forEach(function(tag) {
      expandedTags.add(tag);
      let index = tag.indexOf(':');
      if (index > -1) {
        expandedTags.add(tag.substr(0, index));
      }
    });
    let body = {
      tags: Array.from(expandedTags),
      value: stringifyValue ? JSON.stringify(value) : value,
      type: type,
      timestamp: new Date().toISOString()
    };
    body[type] = value;
    if (salt) {
      const crypto = require('crypto');
      const sha1 = crypto.createHash('sha1');
      sha1.update(body.type + body.value + body.timestamp + salt);
      body.digest = sha1.digest('hex');
    }
    return body;
  };

  return {
    event: function(tags, value, type, salt) {
      logger.log('ELASTICSEARCH EVENT ' + JSON.stringify({
        tags: tags,
        value: value,
        type: type,
        salt: salt
      }));

      let path = elasticSearchConfig.eventIndex;
      if (!path) {
        throw new Error('no index/type');
      }

      let index1 = path.indexOf('{');
      let index2 = path.indexOf('}', index1);

      if (index1 > -1 && index2 > -1) {
        let part1 = path.substr(0, index1);
        let part2 = path.substr(index1 + 1, index2 - index1 - 1).replace('dd', 'DD');
        path = part1 + dateFormat(new Date(), part2);
      }

      if (!type) {
        type = path.substr(index2 + 1);
      }

      const event = $this.normalizeEvent(tags, value, type, salt, true);

      return _(elasticSearchClient.index({
        index: path,
        type: type,
        body: event
      }))
    },
    eventV2: function(tags, value, type, salt) {
      logger.log('ELASTICSEARCH EVENT V2' + JSON.stringify({
        tags: tags,
        value: value,
        type: type,
        salt: salt
      }));

      let path = elasticSearchConfig.eventV2Index;
      if (!path) {
        throw new Error('no index/type');
      }

      let index1 = path.indexOf('{');
      let index2 = path.indexOf('}', index1);

      if (index1 > -1 && index2 > -1) {
        let part1 = path.substr(0, index1);
        let part2 = path.substr(index1 + 1, index2 - index1 - 1).replace('dd', 'DD');
        path = part1 + dateFormat(new Date(), part2);
      }

      if (!type) {
        type = path.substr(index2 + 1);
      }

      const event = $this.normalizeEvent(tags, value, type, salt, false);

      return _(elasticSearchClient.index({
        index: path,
        type: type,
        body: event
      }))
    },
    count: function(term, range, seconds) {
      logger.log('ELASTICSEARCH COUNT ' + JSON.stringify({
        term: term,
        range: range,
        seconds: seconds
      }));

      let query = $this.query([{
        term: term
      }], seconds);
      query.body.query.bool.filter.push({
        range: range
      });

      return _(
        elasticSearchClient
        .search(query)
      ).map((response) => {
        return response.hits.total;
      });
    },
    search: function(term, seconds, size) {
      logger.log('ELASTICSEARCH SEARCH ' + JSON.stringify({
        term: term,
        seconds: seconds,
        size: size
      }));

      let path = elasticSearchConfig.eventIndex;
      if (!path) {
        throw new Error('no index/type');
      }

      let index1 = path.indexOf('{');
      let index2 = path.indexOf('}', index1);

      if (index1 > -1 && index2 > -1) {
        let part1 = path.substr(0, index1);
        let part2 = path.substr(index1 + 1, index2 - index1 - 1).replace('dd', 'DD');
        path = part1 + dateFormat(new Date(), part2);
      }

      return _(elasticSearchClient.indices.exists({
        index: path
      }).then(indexExists => {
        if (indexExists) {
          return elasticSearchClient.search($this.searchQuery(path, term, seconds, size));
        } else {
          logger.log('ELASTICSEARCH: index does not exist: ' + path);
          return _.nil;
        }
      }));
    },
    average: function(term, on, seconds) {
      logger.log('ELASTICSEARCH AVERAGE ' + JSON.stringify({
        term: term,
        on: on,
        seconds: seconds
      }));

      let query = $this.query([{
        term: term
      }], seconds);
      query.body.aggregations = {
        agg: {
          avg: {
            field: on
          }
        }
      };

      return _(
        elasticSearchClient
        .search(query)
      ).map((response) => {
        let total = response.hits.total;
        return {
          total: total,
          rate: Math.round(total / seconds * 100) / 100,
          average: Math.round(response.aggregations ? response.aggregations.agg.value * 10 : 0) / 10
        };
      });
    },
    stats: function(filters, on, seconds) {
      logger.log('ELASTICSEARCH STATS ' + JSON.stringify({
        filters: filters,
        on: on,
        seconds: seconds
      }));

      let query = $this.query(filters, seconds);
      query.body.aggregations = {
        agg: {
          extended_stats: {
            field: on
          }
        }
      };

      return _(elasticSearchClient
        .search(query)).map((response) => {
        let total = response.hits.total;
        let returnValue = {
          total: total,
          rate: Math.round(total / seconds * 100) / 100,
          avg: response.aggregations ? (Math.round(response.aggregations.agg.avg * 10) / 10) : 0,
          min: response.aggregations ? (Math.round(response.aggregations.agg.min * 10) / 10) : 0,
          max: response.aggregations ? (Math.round(response.aggregations.agg.max * 10) / 10) : 0,
          stdDeviation: response.aggregations ? (Math.round(response.aggregations.agg.std_deviation * 10) / 10) : 0
        };
        return returnValue;
      });
    },
    percentile: function(filters, on, seconds, percentilesValues) {
      logger.log('ELASTICSEARCH PERCENTILE ' + JSON.stringify({
        filters: filters,
        on: on,
        seconds: seconds
      }));

      let query = $this.query(filters, seconds);
      query.body.aggregations = {
        agg: {
          percentiles: {
            field: on,
            percents: percentilesValues
          }
        }
      };

      return _(
        elasticSearchClient
        .search(query)
      ).map((response) => {
        let total = response.hits.total;
        let percentiles = response.aggregations ? response.aggregations.agg.values : prepareEmptyPercentiles(percentilesValues);
        Object.keys(percentiles).map(function(key, index) {
          percentiles[key] = percentiles[key] === "NaN" ? 0 : (Math.round(percentiles[key] * 10) / 10);
        });
        let returnValue = {
          total: total,
          rate: Math.round(total / seconds * 100) / 100,
          percentile: percentiles
        };
        return returnValue;
      });
    }
  }
};

function prepareEmptyPercentiles(percentilesValues) {
  let percentiles = {};
  percentilesValues.forEach(v => (percentiles[(v + '.0')] = 0));
  return percentiles;
};
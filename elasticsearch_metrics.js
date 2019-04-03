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
    eventIndex: options.vamp_elasticsearch_event_index || process.env.VAMP_ELASTICSEARCH_EVENT_INDEX
  }

  const elasticSearchClient = elasticSearchClientFactory.create(elasticSearchConfig);

  this.query = function(term, seconds) {
    return {
      index: elasticSearchConfig.metricsIndex,
      type: elasticSearchConfig.metricsType,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [{
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
    };
  };

  this.normalizeEvent = function(tags, value, type, salt) {
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
      value: JSON.stringify(value),
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

      if(!type) {
         type = path.substr(index2 + 1);
      }

      const event = $this.normalizeEvent(tags, value, type, salt);

      logger.log('ELASTICSEARCH CLIENT CALL: index: ' + path + ', type: ' + type + ', body: ' + JSON.stringify(event));
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

      let query = $this.query(term, seconds);
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
    average: function(term, on, seconds) {
      logger.log('ELASTICSEARCH AVERAGE ' + JSON.stringify({
        term: term,
        on: on,
        seconds: seconds
      }));

      let query = $this.query(term, seconds);
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
          average: Math.round(response.aggregations ? response.aggregations.agg.value * 100 : 0) / 100
        };
      });
    },
    stats: function(term, on, seconds) {
      logger.log('ELASTICSEARCH STATS ' + JSON.stringify({
        term: term,
        on: on,
        seconds: seconds
      }));

      let query = $this.query(term, seconds);
      query.body.aggregations = {
        agg: {
          extended_stats: {
            field: on
          }
        }
      };

      return _(elasticSearchClient
        .search(query)).map((response) => {
        logger.log('ELASTICSEARCH STATS RESPONSE: ' + JSON.stringify(response));
        let total = response.hits.total;
        let returnValue = {
          total: total,
          rate: Math.round(total / seconds * 100) / 100,
          avg: Math.round(response.aggregations.agg.avg * 100) / 100,
          min: Math.round(response.aggregations.agg.min * 100) / 100,
          max: Math.round(response.aggregations.agg.max * 100) / 100,
          stdDeviation: Math.round(response.aggregations.agg.std_deviation * 100) / 100
        };
        logger.log('ELASTICSEARCH STATS RETURN VALUE: ' + JSON.stringify(returnValue));
        return returnValue;
      });
    },
    percentile: function(term, on, seconds, percentilesValues) {
      logger.log('ELASTICSEARCH PERCENTILE ' + JSON.stringify({
        term: term,
        on: on,
        seconds: seconds
      }));

      let query = $this.query(term, seconds);
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
        logger.log('ELASTICSEARCH PERCENTILE RESPONSE: ' + JSON.stringify(response));
        let total = response.hits.total;
        let percentiles = response.aggregations.agg.values;
        Object.keys(percentiles).map(function(key, index) {
          percentiles[key] = percentiles[key] === "NaN" ? 0 : percentiles[key];
        });
        let returnValue = {
          total: total,
          rate: Math.round(total / seconds * 100) / 100,
          percentile: percentiles
        };
        logger.log('ELASTICSEARCH STATS RETURN VALUE: ' + JSON.stringify(returnValue));
        return returnValue;
      });
    }
  }
};
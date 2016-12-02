/*
 * Based on a 5s scrape interval.
 */

'use strict';

var _ = require('highland');
var rp = require('request-promise');

var prom_endpoint = process.env.VAMP_METRICS_ENDPOINT || config['vamp.metrics.endpoint'];

module.exports = function($this, query_options) {
    // Help:
    // var query_options = {frontend: gateway.lookup_name, code: '5xx'};
    var frontend = query_options.frontend;
    var code = query_options.code;

    var options = {
        uri: prom_endpoint + '/api/v1/query',
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true
    };

    return {
        count: function(config) {
            var query = "sum(rate(haproxy_frontend_http_responses_total{frontend=\""+frontend+"\",code=\""+code+"\"}[10s])) by (frontend)";
            options.qs = {query: query};
            return _(rp(options)
                .then(function(v) {
                    var total = Math.round(v.data.result[0].value[1]);
                    var healthy = total? 0 : 1;
                    return {
                        total: total,
                        healthy: healthy
                    };
                })
                .catch(function (err) {
                    console.log(err);
                }));
        },
        average: function(config) {
            var query = "sum(rate(haproxy_frontend_http_requests_total{frontend=\""+frontend+"\"}[10s])) by (frontend)";
            options.qs = {query: query};
            return _(rp(options)
                .then(function(v) {
                    var rps = Math.round(v.data.result[0].value[1] * 100) / 100;
                    // TODO: total and average should be filled, somehow...
                    return {
                      total: 0,
                      rate: rps,
                      average: 0
                    };
                })
                .catch(function (err) {
                    console.log(err);
                }));
        }
    };
}

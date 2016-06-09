'use strict';

var elasticsearch = require('elasticsearch');

var Metrics = function (api) {
    this.api = api
};

Metrics.prototype.count = function (term, range, seconds, callback) {

    this.api.config(function (config) {

        var esClient = new elasticsearch.Client({
            host: config['vamp.pulse.elasticsearch.url'],
            log: 'error'
        });

        esClient.search({
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
        }).then(function (response) {
            callback(response.hits.total);
        }, function (err) {
        });
    });
};

Metrics.prototype.average = function (term, on, seconds, callback) {

    this.api.config(function (config) {

        var esClient = new elasticsearch.Client({
            host: config['vamp.pulse.elasticsearch.url'],
            log: 'error'
        });

        esClient.search({
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
        }).then(function (response) {

            var total = response.hits.total;
            var rate = Math.round(total / seconds * 100) / 100;
            var average = Math.round(response.aggregations.agg.value * 100) / 100;

            callback(total, rate, average);

        }, function (err) {
        });
    });
};

module.exports = Metrics;
'use strict';

var metrics = require('./elasticsearch_metrics')
const apiStub = {
    config: () => {
        return {
            'vamp.gateway-driver.elasticsearch.metrics.type': 'log',
            'vamp.gateway-driver.elasticsearch.metrics.index': 'vamp-vga-6d1339c7c7a1ac54246a57320bb1dd15176ce29-2019-03-25'
        };
    }
};

const elasticsearchMetrics = new metrics(apiStub, {});


elasticsearchMetrics.average({ft: 'virtual_hosts'}, 'Tt', 1000000).head().each(function(value) {
    console.log(value);
});

elasticsearchMetrics.stats({ft: 'virtual_hosts'}, 'Tt', 1000000).head().each(function(value) {
    console.log(value);
});

elasticsearchMetrics.percentile({ft: 'virtual_hosts'}, 'Tt', 1000000, [50,66,75,80,90,95,98,99,100]).head().each(function(value) {
    console.log(value);
});
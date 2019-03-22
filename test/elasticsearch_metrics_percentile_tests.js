var metrics = require('../elasticsearch_metrics')
var elasticsearchClientFactory = require('../elasticsearch_client_factory')
var should = require('should');
var sinon = require('sinon');

describe('when getting percentile', () => {
    var responseStream, searchQuery;
    before(() => {
        const elasticsearchClientStub = sinon.stub({
            index: (eventDefinition) => {
            },
            search: (query) => {
                return {
                    took: 1,
                    timed_out: false,
                    _shards:
                        {
                            total: 5,
                            successful: 5,
                            skipped: 0,
                            failed: 0,
                        },
                    hits:
                        {
                            total: 18,
                            max_score: 0,
                        },
                    aggregations:
                        {
                            agg:
                                {
                                    values:
                                        {
                                            '50.0': 0.5,
                                            '66.0': 2,
                                            '75.0': 2,
                                            '80.0': 2.60,
                                            '90.0': 707.60,
                                            '95.0': 1655.09,
                                            '98.0': 1825.44,
                                            '99.0': 1882.21,
                                            '100.0': 1939
                                        }
                                }
                        }
                }
            }


        });
        sinon.stub(elasticsearchClientFactory, 'create').returns(elasticsearchClientStub);

        const options = {}
        const apiStub = {
            config: () => {
                return {
                    'vamp.gateway-driver.elasticsearch.metrics.type': 'metricsType',
                    'vamp.gateway-driver.elasticsearch.metrics.index': 'metricsIndex'
                };
            }
        };
        const elasticsearchMetrics = new metrics(apiStub, options);
        responseStream = elasticsearchMetrics.percentile('testTerm', 'testAggregationField', 100, [50,66,75,80,90,95,98,99,100]);
        const searchCall = elasticsearchClientStub.search.lastCall;
        searchQuery = searchCall.args[0];
    });

    after(() => {
        elasticsearchClientFactory.create.restore();
    });

    it('search query index should be set', () => {
        searchQuery.should.have.property('index', 'metricsIndex');
    });

    it('search query type should be set', () => {
        searchQuery.should.have.property('type', 'metricsType');
    });

    it('search query filter term should be set', () => {
        const queryFilterTerm = searchQuery.body.query.bool.filter[0].term;
        queryFilterTerm.should.equal('testTerm');
    });

    it('search query filter time range should be set', () => {
        const queryFilterTimeRange = searchQuery.body.query.bool.filter[1].range;
        const timestampGreaterThan = queryFilterTimeRange["@timestamp"].gt;
        timestampGreaterThan.should.equal('now-100s');
    });

    it('search query aggregation should be set', () => {
        const aggregationField = searchQuery.body.aggregations.agg.percentiles.field;
        aggregationField.should.equal('testAggregationField');
        // const percents = searchQuery.body.aggregations.agg.percentiles.percents;
        // percents.should.equal([50,66,75,80,90,95,98,99,100]);
    });

    it('search query should return min metrics', () => {
        responseStream
            .tap(r => console.log(r))
            .tap(response => {
            console.log(response);
            response.total.should.equal(10);
            response.rate.should.equal(0.1);
            response.stats.min.should.equal(0);
            response.stats.max.should.equal(1939);
            response.stats.avg.should.equal(228.11);
            response.stats.std_deviation.should.equal(571.65);
        }).done();
    });
});
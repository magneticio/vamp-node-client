var metrics = require('../elasticsearch_metrics')
var elasticsearchClientFactory = require('../elasticsearch_client_factory')
var should = require('should');
var sinon = require('sinon');

describe('When getting count', () => {
    var searchQuery, countStream;
    before(() => {
        const elasticsearchClientStub = {
            search: sinon.stub().returns(new Promise((resolve) => {
                resolve({
                    hits: {
                        total: 10
                    }
                })
            }))
        };
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
        countStream = elasticsearchMetrics.count('testTerm', 'testRange', 100);
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

    it('search query filter range should be set', () => {
        const queryFilterRange = searchQuery.body.query.bool.filter[2].range;
        queryFilterRange.should.equal('testRange');
    });

    it('search query should return total hits', () => {
        countStream.head().tap(count => count.should.equal(10)).done(r => {
        });
    });
});
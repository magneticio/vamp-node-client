var metrics = require('../elasticsearch_metrics')
var elasticsearchClientFactory = require('../elasticsearch_client_factory')
var should = require('should');
var sinon = require('sinon');

describe('when getting average', () => {
  var responseStream, searchQuery;
  before(() => {
    const elasticsearchClientStub = sinon.stub({
      index: (eventDefinition) => {},
      search: (query) => {
        hits: {
          total: 10
        }
        aggregations: {
          agg: {
            value: 50
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
    responseStream = elasticsearchMetrics.average('testTerm', 'testAggregationField', 100);
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
    const aggregationField = searchQuery.body.aggregations.agg.avg.field;
    aggregationField.should.equal('testAggregationField');
  });

  it('search query should return average metrics', () => {
    responseStream.head().tap(response => {
      response.total.should.equal(10);
      response.rate.should.equal(0.1);
      response.average.should.equal(0.5);
    }).done();
  });
});
var metrics = require('../elasticsearch_metrics')
var elasticsearchClientFactory = require('../elasticsearch_client_factory')
var sinon = require('sinon');

describe('when getting stats', () => {
  var responseStream, searchQuery;
  before(() => {
    let clientStub = {
      search: sinon.stub().returns(new Promise((resolve) => {
        resolve({
          took: 0,
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
              total: 17,
              max_score: 0,
            },
          aggregations:
            {
              agg:
                {
                  count: 17,
                  min: 0,
                  max: 1939,
                  avg: 228.11444,
                  sum: 3878,
                  sum_of_squares: 64,
                  variance: 326791.63,
                  std_deviation: 571.6543332
                }
            }
        })
      }))
    };

    sinon.stub(elasticsearchClientFactory, 'create').returns(clientStub);

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
    responseStream = elasticsearchMetrics.stats('testTerm', 'testAggregationField', 100);
    const searchCall = clientStub.search.lastCall;
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
    const aggregationField = searchQuery.body.aggregations.agg.extended_stats.field;
    aggregationField.should.equal('testAggregationField');
  });

  it('search query should return stats metrics', () => {
    responseStream.head().tap(response => {
      response.total.should.equal(17);
      response.min.should.equal(0);
      response.max.should.equal(1939);
      response.avg.should.equal(228.11);
      response.stdDeviation.should.equal(571.65);
    }).done(r => {
    });
  });
});
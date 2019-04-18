var metrics = require('../elasticsearch_metrics')
var elasticsearchClientFactory = require('../elasticsearch_client_factory')
var sinon = require('sinon');

describe('when getting percentile', () => {
  var responseStream, searchQuery;
  before(() => {
    let clientStub = {
      search: sinon.stub().returns(new Promise((resolve) => {
        resolve({
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
                      '75.0': 0,
                      '80.0': 2.60,
                      '90.0': 707.60,
                      '95.0': 1655.091111,
                      '98.0': 1825.44333,
                      '99.0': 1882.21,
                      '100.0': 1939
                    }
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
    responseStream = elasticsearchMetrics.percentile('testTerm', 'testAggregationField', 100, [50, 66, 75, 80, 90, 95, 98, 99, 100]);
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
    const aggregationField = searchQuery.body.aggregations.agg.percentiles.field;
    aggregationField.should.equal('testAggregationField');
    const percents = searchQuery.body.aggregations.agg.percentiles.percents;
    percents[0].should.equal(50);
    percents[1].should.equal(66);
    percents[2].should.equal(75);
    percents[3].should.equal(80);
    percents[4].should.equal(90);
    percents[5].should.equal(95);
    percents[6].should.equal(98);
    percents[7].should.equal(99);
    percents[8].should.equal(100);
  });

  it('search query should return min metrics', () => {
    responseStream
      .tap(response => {
        response.total.should.equal(18);
        response.rate.should.equal(0.18);
        response.percentile['50.0'].should.equal('0.5');
        response.percentile['66.0'].should.equal('2.0');
        response.percentile['75.0'].should.equal('0.0');
        response.percentile['80.0'].should.equal('2.6');
        response.percentile['90.0'].should.equal('707.6');
        response.percentile['95.0'].should.equal('1655.1');
        response.percentile['98.0'].should.equal('1825.4');
        response.percentile['99.0'].should.equal('1882.2');
        response.percentile['100.0'].should.equal('1939.0');
      }).done(r => {
    });
  });
});
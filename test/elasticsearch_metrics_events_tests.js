var metrics = require('../elasticsearch_metrics')
var elasticsearchClientFactory = require('../elasticsearch_client_factory')
var should = require('should');
var sinon = require('sinon');

describe('When publishing an event', () => {
  var apiStub = {
    config: () => {
      return {};
    }
  };
  var elasticsearchClientStub;

  before(() => {
    elasticsearchClientStub = sinon.stub({
      index: (eventDefinition) => {},
      search: (query) => {}
    });
    sinon.stub(elasticsearchClientFactory, 'create').returns(elasticsearchClientStub);
  });

  after(() => {
    elasticsearchClientFactory.create.restore();
  });

  describe('and event index is empty', () => {
    var elasticsearchMetrics;
    before(() => {
      elasticsearchMetrics = new metrics(apiStub, {});
    });

    it('should throw `no index/type` exception', () => {
      should(() => elasticsearchMetrics.event(['testTag'], 'testValue', 'testType', 'salt')).throw('no index/type');
    });
  });

  describe('and event index is present', () => {
    const options = {
      vamp_elasticsearch_event_index: 'testIndex'
    }
    var indexEventDefinition;
    var eventError = null;

    before(() => {
      const elasticsearchMetrics = new metrics(apiStub, options);
      try {
        elasticsearchMetrics.event(['testTag:latest', 'testTag2'], 'testValue', 'testType', 'salt');
      } catch (error) {
        eventError = error;
      }

      const indexCall = elasticsearchClientStub.index.lastCall;
      indexEventDefinition = indexCall.args[0];
    });

    it('should not throw exception', () => {
      should.not.exist(eventError);
    });

    it('should use specified index', () => {
      indexEventDefinition.should.have.property('index', options.vamp_elasticsearch_event_index);
    });

    it('should use specified type', () => {
      indexEventDefinition.should.have.property('type', 'testType');
    });

    it('should create normalized event', () => {
      var eventBody = indexEventDefinition.body;
      eventBody.should.have.property('value', '"testValue"');
      eventBody.should.have.property('type', 'testType');
      eventBody.should.have.property('tags', ['testTag:latest', 'testTag', 'testTag2']);
      eventBody.timestamp.should.be.an.instanceOf(String);
      eventBody.digest.should.be.an.instanceOf(String);
    });
  });
});
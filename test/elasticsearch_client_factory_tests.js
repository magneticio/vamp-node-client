var elasticsearchClientFactory = require('../elasticsearch_client_factory')
var fs = require('fs')
var should = require('should');
var sinon = require('sinon');

describe('When creating elasticsearch client', () => {
  describe('and ca certificate is not enabled', () => {
    const elasticSearchConfig = {
      url: 'testUrl',
      apiVersion: '6.5'
    }
    const client = elasticsearchClientFactory.create(elasticSearchConfig);

    it('elasticsearch host url should be set', () => {
      client.transport._config.host.should.equal('testUrl');
    });

    it('elasticsearch api version should be set', () => {
      client.transport._config.apiVersion.should.equal('6.5');
    });
  });

  describe('and CA certificate is enabled', () => {
    describe('but CA certificate does not exist in the provided location', () => {
      const elasticSearchConfig = {
        url: 'testUrl',
        apiVersion: '6.5',
        caCertPath: 'nonexistent/path',
        clientCertPath: './test/resources/client.crt',
        clientCertKeyPath: './test/resources/client.key',
        clientCertKeyPassword: 'testpassword'
      }
      before(() => {
        sinon.stub(fs, 'existsSync').returns(false);
      });
      after(() => {
        fs.existsSync.restore();
      });

      it('should throw error', () => {
        should(() => elasticsearchClientFactory.create(elasticSearchConfig)).throw('CA certificate file not found: nonexistent/path');
      });
    });

    describe('and CA certificate exists in the provided location', () => {
      const elasticSearchConfig = {
        url: 'testUrl',
        apiVersion: '6.5',
        caCertPath: './test/resources/ca.crt',
        clientCertPath: './test/resources/client.crt',
        clientCertKeyPath: './test/resources/client.key',
        clientCertKeyPassword: 'testpassword'
      }
      var client;
      before(() => {
        sinon.stub(fs, 'existsSync').returns(true);
        client = elasticsearchClientFactory.create(elasticSearchConfig);
      });
      after(() => {
        fs.existsSync.restore();
      });

      it('elasticsearch host url should be set', () => {
        client.transport._config.host.should.equal('testUrl');
      });

      it('elasticsearch api version should be set', () => {
        client.transport._config.apiVersion.should.equal('6.5');
      });

      it('CA certificate should be set', () => {
        should.exist(client.transport._config.ssl.ca);
      });
    });
  });
});
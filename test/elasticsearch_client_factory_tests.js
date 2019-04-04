var elasticsearchClientFactory = require('../elasticsearch_client_factory')
var should = require('should');

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
        caCertPath: 'nonexistent/ca/certificate/path',
        clientCertPath: './test/resources/client.crt',
        clientCertKeyPath: './test/resources/client.key',
        clientCertKeyPassword: 'testpassword'
      }

      it('should throw error', () => {
        should(() => elasticsearchClientFactory.create(elasticSearchConfig)).throw('CA certificate file not found: nonexistent/ca/certificate/path');
      });
    });

    describe('and CA certificate exists in the provided location', () => {

      describe('and client certificte is not enabled', () => {
        const elasticSearchConfig = {
          url: 'testUrl',
          apiVersion: '6.5',
          caCertPath: './test/resources/ca.crt',
          clientCertPath: './test/resources/client.crt',
          clientCertKeyPath: './test/resources/client.key',
          clientCertKeyPassword: 'testpassword'
        }
        var client = elasticsearchClientFactory.create(elasticSearchConfig);

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

      describe('and client certificate is enabled', () => {

        describe('but client certificate does not exist in the provided location', () => {
          const elasticSearchConfig = {
            url: 'testUrl',
            apiVersion: '6.5',
            caCertPath: './test/resources/ca.crt',
            clientCertPath: 'nonexistent/client/certificate/path',
            clientCertKeyPath: './test/resources/client.key',
            clientCertKeyPassword: 'testpassword'
          }

          it('should throw error', () => {
            should(() => elasticsearchClientFactory.create(elasticSearchConfig)).throw('Client certificate file not found: nonexistent/client/certificate/path');
          });
        });

        describe('and client certificate exists in the provided location', () => {

          describe('but client certificate private key does not exist in the provided location', () => {
            const elasticSearchConfig = {
              url: 'testUrl',
              apiVersion: '6.5',
              caCertPath: './test/resources/ca.crt',
              clientCertPath: './test/resources/client.crt',
              clientCertKeyPath: 'nonexistent/client/certificate/key/path',
              clientCertKeyPassword: 'testpassword'
            }

            it('should throw error', () => {
              should(() => elasticsearchClientFactory.create(elasticSearchConfig)).throw('Client certificate private key file not found: nonexistent/client/certificate/key/path');
            });
          });

          describe('and client certificate private key exists in the provided location', () => {
            const elasticSearchConfig = {
              url: 'testUrl',
              apiVersion: '6.5',
              caCertPath: './test/resources/ca.crt',
              clientCertPath: './test/resources/client.crt',
              clientCertKeyPath: './test/resources/client.key',
              clientCertKeyPassword: 'testpassword'
            }
            var client = elasticsearchClientFactory.create(elasticSearchConfig);

            it('elasticsearch host url should be set', () => {
              client.transport._config.host.should.equal('testUrl');
            });

            it('elasticsearch api version should be set', () => {
              client.transport._config.apiVersion.should.equal('6.5');
            });

            it('CA certificate should be set', () => {
              should.exist(client.transport._config.ssl.ca);
            });

            it('Client certificate should be set', () => {
              should.exist(client.transport._config.ssl.cert);
            });

            it('Client certificate private key should be set', () => {
              should.exist(client.transport._config.ssl.key);
            });

            it('Client certificate private key password should be set', () => {
              should.exist(client.transport._config.ssl.passphrase);
            });
          });
        });
      });
    });
  });
});
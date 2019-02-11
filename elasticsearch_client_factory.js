'use strict';

let elasticsearch = require('elasticsearch');
let fs = require('fs');

function create(elasticSearchConfig) {
  if (!elasticSearchConfig.caCertPath) {
    return new elasticsearch.Client({
      host: elasticSearchConfig.url,
      apiVersion: elasticSearchConfig.apiVersion
    });
  }

  if (fs.existsSync(elasticSearchConfig.caCertPath) === false) {
    throw new Error(`CA certificate file not found: ${elasticSearchConfig.caCertPath}`);
  }

  if (!elasticSearchConfig.clientCertPath) {
    return new elasticsearch.Client({
      host: elasticSearchConfig.url,
      apiVersion: elasticSearchConfig.apiVersion,
      ssl: {
        ca: fs.readFileSync(elasticSearchConfig.caCertPath),
        rejectUnauthorized: true
      }
    });
  }

  if (fs.existsSync(elasticSearchConfig.clientCertPath) === false) {
    throw new Error(`Client certificate file not found: ${elasticSearchConfig.clientCertPath}`);
  }

  if (fs.existsSync(elasticSearchConfig.clientCertKeyPath) === false) {
    throw new Error(`Client certificate private key file not found: ${elasticSearchConfig.clientCertKeyPath}`);
  }

  return new elasticsearch.Client({
    host: elasticSearchConfig.url,
    apiVersion: elasticSearchConfig.apiVersion,
    ssl: {
      ca: fs.readFileSync(elasticSearchConfig.caCertPath),
      cert: fs.readFileSync(elasticSearchConfig.clientCertPath),
      key: fs.readFileSync(elasticSearchConfig.clientCertKeyPath),
      passphrase: elasticSearchConfig.clientCertKeyPassword,
      rejectUnauthorized: true
    }
  });
}

module.exports.create = create;
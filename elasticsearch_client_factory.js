'use strict';

let elasticsearch = require('elasticsearch');
let fs = require('fs');

function create(elasticSearchConfig) {
  console.info(process.cwd());
  if (elasticSearchConfig.caCertPath) {
    if (fs.existsSync(elasticSearchConfig.caCertPath) === false) {
      throw new Error(`CA certificate file not found: ${elasticSearchConfig.caCertPath}`)
    }
    return new elasticsearch.Client({
      host: elasticSearchConfig.url,
      apiVersion: elasticSearchConfig.apiVersion,
      ssl: {
        ca: fs.readFileSync(elasticSearchConfig.caCertPath),
        rejectUnauthorized: true
      }
    });
  }

  return new elasticsearch.Client({
    host: elasticSearchConfig.url,
    apiVersion: elasticSearchConfig.apiVersion
  });
}

module.exports.create = create;
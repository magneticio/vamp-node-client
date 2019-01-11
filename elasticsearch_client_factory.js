'use strict';

let elasticsearch = require('elasticsearch');
let fs = require('fs');

module.exports = function(elasticSearchConfig) {
  return {
    create: function() {
      if (elasticSearchConfig.caCertPath) {
        if (fs.existsSync(elasticSearchConfig.caCertPath) === false) {
          throw new Error(`Certificate file not found: ${elasticSearchConfig.caCertPath}`)
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
  }
}
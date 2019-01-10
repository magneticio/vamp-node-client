'use strict';

let elasticsearch = require('elasticsearch');
let fs = require('fs');

module.exports = function(elasticSearchConfig) {
  return {
    create: function() {
      if (elasticSearchConfig.certPath) {
        return new elasticsearch.Client({
          host: elasticSearchConfig.url,
          apiVersion: elasticSearchConfig.apiVersion,
          ssl: {
            ca: fs.readFileSync(elasticSearchConfig.certPath),
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
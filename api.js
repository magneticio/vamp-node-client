'use strict';

var request = require('request');

var http = request.defaults({
    headers: {'Accept': 'application/json', 'Content-Type': 'application/json'}
});

var Api = function (opts) {

    opts = opts || {};

    if (!opts.host) {
        opts.host = (process.env.VAMP_URL || 'http://127.0.0.1');
    }

    if (!opts.path) {
        opts.path = '/api/v1';
    }

    this.url = opts.host + opts.path + '/';

    this.api = function (api, callback) {
        http(this.url + api, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(JSON.parse(body));
            }
        });
    }
};

Api.prototype.info = function (callback) {
    this.api('info', callback);
};

Api.prototype.config = function (callback) {
    this.api('config', callback);
};

Api.prototype.gateways = function (callback) {
    // TODO pagination
    this.api('gateways?per_page=1000', callback);
};

Api.prototype.deployments = function (callback) {
    // TODO pagination
    this.api('deployments?per_page=1000', callback);
};

Api.prototype.event = function (tags, value, type) {
    if (!type) type = "event";
    http.post({url: this.url + 'events', json: {tags: tags, value: value, type: type}}, function (e, r, body) {
    });
};

module.exports = Api;
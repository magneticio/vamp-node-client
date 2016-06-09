'use strict';

var request = require('request');
var http = request.defaults({
    headers: {'Accept': 'application/json'}
});

var Api = function (opts) {

    opts = opts || {};

    if (!opts.host) {
        opts.host = (process.env.VAMP_URL || 'http://127.0.0.1');
    }

    if (!opts.path) {
        opts.path = '/api/v1';
    }

    this.api = function (api, callback) {
        http(opts.host + opts.path + '/' + api, function (error, response, body) {
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

exports.Api = Api;
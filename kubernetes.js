'use strict';
const Kubernetes = require('kubernetes-client');

module.exports = function (opts) {
    opts = opts || {};
    opts.url = opts.url || process.env.KUBERNETES_URL;
    opts.namespace = opts.namespace || process.env.KUBERNETES_NAMESPACE;

    let config = {
        url: opts.url,
        namespace: opts.namespace
    };

    // If running within a Pod use Kubernetes' config
    const host = process.env.KUBERNETES_SERVICE_HOST;
    const port = process.env.KUBERNETES_SERVICE_PORT;
    if (host && port) {
        config = Api.config.getInCluster();
    }

    return {
        api: () => new Kubernetes.Api(config),
        core: () => new Kubernetes.Core(config),
        extensions: () => new Kubernetes.Extensions(config)
    }
}
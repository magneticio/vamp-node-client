# Vamp Node.js Client

This is the NodeJS implementation for Vamp client.

You can use specific metric backends using the following environment variable:

`VAMP_METRICS_BACKEND=elasticsearch`

Install using `node install`.

## Examples using Elasticsearch
```javascript
var _ = require('highland');
var vamp = require('vamp-node-client');

var api = new vamp.Api({
    host: 'http://localhost:9090', // by default: $VAMP_URL || 'http://127.0.0.1'
    path: '/api/v1'                // by default: '/api/v1'
});
var metrics = new vamp.Metrics(api);
```

### Info

```javascript
api.info().each(function (info) {
    _.log(info.message);
});
```

### Configuration

```javascript
api.config().each(function (config) {
    _.log(config['vamp.info.message']);
});
```

### Publishing an event

```javascript
api.event(['tag1:a', 'tag2:b'], 'abcd');
```

### Aggregate

```javascript
metrics.average({ ft: 'abc' }, 'Tt', 30).each(function(response) {
    // response.total, response.rate, response.average
});
```

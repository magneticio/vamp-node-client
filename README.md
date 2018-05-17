# Vamp Node.js Client

This is the NodeJS implementation for Vamp client.

Install using `node install`.

### Info

```javascript
let _ = require('highland');
let vamp = require('vamp-node-client');

let api = new vamp.Api();
    
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

### Example using Elasticsearch metrics

```javascript
let _ = require('highland');
let vamp = require('vamp-node-client');

// overriding configuration
let api = new vamp.Api({
    host: 'http://localhost:9090', // by default: $VAMP_URL || 'http://127.0.0.1'
    path: '/api/v1'                // by default: '/api/v1'
});

let metrics = new vamp.ElasticsearchMetrics(api);
metrics.average({ ft: 'abc' }, 'Tt', 30).each(function(response) {
    // response.total, response.rate, response.average
    _.log(response);
});
```

### Event digest validation

Run `node digest-check.js [directory] [salt]`:

- `directory` - directory where event `json` files are
- `salt` - SHA1 salt used for creating original event digests (signatures)

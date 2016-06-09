Vamp Node.js Client
-------------------

```javascript
var vamp = require('vamp-node-client');
var api = new vamp.Api({
    host: 'http://localhost:9090', // by default: $VAMP_URL || 'http://127.0.0.1'
    path: '/api/v1'                // by default: '/api/v1'
});
var metrics = new vamp.Metrics(api);
```

Info

```javascript
api.info(function (info) {
    console.log(info.message);
});
```

Configuration

```javascript
api.config(function (config) {
    console.log(config['vamp.info.message']);
});
```

Publishing an event

```javascript
api.event(['tag1:a', 'tag2:b'], 'abcd');
```

Aggregate

```javascript
metrics.average({ ft: 'abc' }, 'Tt', 30, function(total, rate, average) {
    // ...
});
```

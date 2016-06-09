Vamp Node.js Client
-------------------

```javascript
var vamp = require('vamp-node-client');
var api = new vamp.Api({
    host: 'http://localhost:9090', // by default: $VAMP_URL || 'http://127.0.0.1'
    path: '/api/v1'                // by default: '/api/v1'
});
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
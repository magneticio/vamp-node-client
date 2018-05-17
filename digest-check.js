'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

if (process.argv.length !== 4) {
  console.error('Usage: node ' + path.basename(__filename) + ' [directory] [salt]');
  process.exit(-1)
}

const salt = process.argv[3];
const directory = process.argv[2];
const files = fs.readdirSync(directory);

files.filter(file => path.extname(file) === '.json').forEach(file => {
  try {
    const json = JSON.parse(fs.readFileSync(directory + '/' + file, 'utf8'));
    const sha1 = crypto.createHash('sha1');
    sha1.update(json.type + json.value + json.timestamp + salt);
    const digest = sha1.digest('hex');
    if (digest !== json.digest) throw 'digest don\'t match';
    console.info('OK: ' + file);
  } catch (e) {
    console.error('ERROR: ' + file);
  }
});
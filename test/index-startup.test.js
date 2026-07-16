const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'www', 'index.html'), 'utf8');

assert.match(html, /document\.addEventListener\(['"]deviceready['"],\s*function\s*\(/);
assert.doesNotMatch(html, /\$\(document\)\.ready/);

console.log('index startup waits for deviceready');

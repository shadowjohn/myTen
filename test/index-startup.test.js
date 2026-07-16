const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'www', 'index.html'), 'utf8');

assert.match(html, /document\.addEventListener\(['"]deviceready['"],\s*function\s*\(/);
assert.doesNotMatch(html, /\$\(document\)\.ready/);
assert.match(html, /id=["']resultList["']/);
assert.match(html, /辨識結果會顯示在這裡/);
assert.match(html, /辨識中…/);
assert.match(html, /辨識失敗，請再試一次/);
assert.match(html, /\(result\.confidence\s*\*\s*100\)\.toFixed\(1\)\s*\+\s*["']%["']/);
assert.doesNotMatch(html, /smallComment\s*\(/);

console.log('index startup and recognition UI checks passed');

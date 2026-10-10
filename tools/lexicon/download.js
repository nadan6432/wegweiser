#!/usr/bin/env node
/* Downloads the real bulk source (needs normal network access; NOT runnable
   in the sandbox this was built in). Streams to disk, prints progress.
     node tools/lexicon/download.js [url] [dest] */
'use strict';
const https = require('https'); const fs = require('fs'); const path = require('path');
const url = process.argv[2] || 'https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl';
const dest = process.argv[3] || path.join(__dirname, '../../data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl');
fs.mkdirSync(path.dirname(dest), { recursive: true });
function get(u, hops){ https.get(u, { headers: { 'User-Agent': 'wegweiser-lexicon-import' } }, res => {
  if([301,302,307,308].includes(res.statusCode) && res.headers.location && hops < 5) return get(new URL(res.headers.location, u).href, hops + 1);
  if(res.statusCode !== 200){ console.error('HTTP ' + res.statusCode + ' for ' + u); process.exit(1); }
  const total = +res.headers['content-length'] || 0; let got = 0, last = 0; const t0 = Date.now();
  res.on('data', c => { got += c.length; if(got - last > 25e6){ last = got; console.error((got/1e6).toFixed(0) + ' MB' + (total ? ' / ' + (total/1e6).toFixed(0) + ' MB' : '')); } });
  res.pipe(fs.createWriteStream(dest)).on('finish', () => console.error('Done: ' + dest + ' (' + (got/1e6).toFixed(0) + ' MB, ' + ((Date.now()-t0)/1000).toFixed(0) + 's)'));
}).on('error', e => { console.error(e.message); process.exit(1); }); }
get(url, 0);

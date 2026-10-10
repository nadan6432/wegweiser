// Minimal static file server for benchmarks/tests (no gzip, no caching headers — worst-case local transfer).
// Usage: node static-server.js <rootDir> <port>
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || '.'), port = +process.argv[3] || 8899;
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css', '.md':'text/plain; charset=utf-8' };
const hits = { count: 0, bytes: 0 };
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__stats') { res.end(JSON.stringify(hits)); return; }
  if (u === '/__reset') { hits.count = 0; hits.bytes = 0; res.end('ok'); return; }
  let p = path.join(root, u === '/' ? 'index.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; res.end('nf'); return; }
  const st = fs.statSync(p);
  hits.count++; hits.bytes += st.size;
  res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream');
  res.setHeader('Content-Length', st.size);
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(p).pipe(res);
}).listen(port, () => console.log('serving', root, 'on', port));

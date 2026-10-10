#!/usr/bin/env node
/* Real-scale import (constant-memory raw read, progress, timing, chunked export):
     node tools/lexicon/stream-run.js --source=wiktextract-jsonl \
       --input=data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl \
       [--out=data/processed/master] [--version=<kaikki dump date>]
   For a ~1 GB file, run with more heap: node --max-old-space-size=8192 ... */
'use strict';
const fs = require('fs'); const path = require('path');
const { runImportStreaming, exportChunked } = require('./streaming.js');
const args = {}; process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)=(.*)$/); if(m) args[m[1]] = m[2]; });
const repoRoot = path.join(__dirname, '..', '..');
if(!args.source || !args.input || !fs.existsSync(args.input)){ console.error('Usage: node tools/lexicon/stream-run.js --source=wiktextract-jsonl --input=<file.jsonl> [--out=dir] [--version=x]\nInput missing or not found: ' + args.input); process.exit(1); }
const outDir = args.out || path.join(repoRoot, 'data/processed/master');
const importDate = new Date().toISOString().slice(0, 10);
runImportStreaming({ repoRoot, sourceName: args.source, inputPath: args.input, importDate, sourceVersion: args.version }).then(({ masterLexicon, dictionaryOnly, report }) => {
  console.error('Exporting chunks...'); const t0 = Date.now();
  exportChunked(masterLexicon, outDir, { source: report.source, pipelineVersion: report.pipelineVersion, importDate });
  report.timingSeconds.export = (Date.now() - t0) / 1000;
  fs.mkdirSync(path.join(repoRoot, 'data/exports'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'data/exports/phase7-audit-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}).catch(e => { console.error(e); process.exit(1); });

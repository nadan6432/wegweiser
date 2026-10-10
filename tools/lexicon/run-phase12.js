#!/usr/bin/env node
/* Phase 12: node tools/lexicon/run-phase12.js --inputs=a.jsonl,b.jsonl,c.jsonl,d.jsonl
   Treats all --inputs as ONE logical source, merges with the existing
   data/processed/master/ output (existing Wegweiser data wins conflicts,
   per Phase 12 §8/§23), re-exports chunks, writes the audit report. */
'use strict';
const fs = require('fs');
const path = require('path');
const { runImportStreaming, exportChunked, loadExistingMasterRaw } = require('./streaming.js');

const args = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)=(.*)$/); if(m) args[m[1]] = m[2]; });
const repoRoot = path.join(__dirname, '..', '..');
const inputs = (args.inputs || '').split(',').map(s => s.trim()).filter(Boolean);
if(!inputs.length){ console.error('Usage: node tools/lexicon/run-phase12.js --inputs=file1.jsonl,file2.jsonl,...'); process.exit(1); }
inputs.forEach(f => { if(!fs.existsSync(f)){ console.error('Input not found:', f); process.exit(1); } });

const masterDir = args.out || path.join(repoRoot, 'data/processed/master');
const importDate = new Date().toISOString().slice(0, 10);

(async () => {
  console.error('Loading existing Wegweiser master lexicon (wins any field conflict)...');
  const existing = loadExistingMasterRaw(masterDir);
  console.error('Existing records loaded: ' + existing.length.toLocaleString());

  const { masterLexicon, enrichedVocab, dictionaryOnly, report } = await runImportStreaming({
    repoRoot, sourceName: 'wiktextract-jsonl', inputPath: inputs, importDate,
    sourceVersion: args.version || 'kaikki.org Wiktextract (German), uploaded Phase 12, dump date unconfirmed for this exact file — see NOTE.md',
    existingMasterRecords: existing,
  });

  console.error('Exporting chunks to ' + masterDir + ' ...');
  const t0 = Date.now();
  exportChunked(masterLexicon, masterDir, { source: report.source, pipelineVersion: report.pipelineVersion, importDate });
  report.timingSeconds.export = (Date.now() - t0) / 1000;

  fs.mkdirSync(path.join(repoRoot, 'data/exports'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'data/exports/phase12-audit-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error('IMPORT FAILED:', e); process.exit(1); });

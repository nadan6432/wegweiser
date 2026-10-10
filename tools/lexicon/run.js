#!/usr/bin/env node
/* ============================================================
   CLI: node tools/lexicon/run.js --source=german-nouns-csv \
          --input=data/raw/german-nouns-wiktionary/nouns.csv \
          [--out=data/processed/master-lexicon.json]

   Multiple sources (spec §49): repeat --source/--input as a comma-
   separated, position-matched pair of lists, e.g.
     --source=german-nouns-csv,wiktextract-jsonl \
     --input=data/raw/german-nouns-wiktionary/nouns.csv,data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl
   The first source in the list wins any lemma-level conflict (spec §50).

   Writes:
     data/processed/master-lexicon.json   (dictionary-only + enriched-flag records)
     data/exports/vocabulary.enriched.json (curated vocab with lexical gaps filled)
     data/exports/phase6-audit-report.json (spec §64/§81 machine-readable report)
   Never overwrites src/content/*.js — enrichment output is a review
   artifact; wiring it back into the curated content packs is a
   deliberate, separate step (spec §4: "do not put raw data directly
   into the app").
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { runImportMulti } = require('./pipeline.js');

function parseArgs(argv){
  const out = {};
  argv.slice(2).forEach(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if(m) out[m[1]] = m[2];
  });
  return out;
}

function main(){
  const args = parseArgs(process.argv);
  const repoRoot = path.join(__dirname, '..', '..');
  const sourceNames = (args.source || '').split(',').map(s => s.trim()).filter(Boolean);
  const inputPaths = (args.input || '').split(',').map(s => s.trim()).filter(Boolean);
  const outPath = args.out || path.join(repoRoot, 'data/processed/master-lexicon.json');

  if(!sourceNames.length || sourceNames.length !== inputPaths.length){
    console.error('Usage: node tools/lexicon/run.js --source=<name>[,<name2>,...] --input=<path>[,<path2>,...] [--out=<path>]');
    console.error('(--source and --input must have the same number of comma-separated entries, matched by position)');
    process.exit(1);
  }
  const sources = sourceNames.map((sourceName, i) => ({ sourceName, inputPath: inputPaths[i] }));
  sources.forEach(({ inputPath }) => {
    if(!fs.existsSync(inputPath)){
      console.error('Input file not found:', inputPath);
      process.exit(1);
    }
  });

  const importDate = new Date().toISOString().slice(0, 10);
  const { masterLexicon, enrichedVocab, dictionaryOnly, report } =
    runImportMulti({ repoRoot, sources, importDate });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ masterLexicon, dictionaryOnly }, null, 2));

  const exportsDir = path.join(repoRoot, 'data/exports');
  fs.mkdirSync(exportsDir, { recursive: true });
  fs.writeFileSync(path.join(exportsDir, 'vocabulary.enriched.json'), JSON.stringify(enrichedVocab, null, 2));
  fs.writeFileSync(path.join(exportsDir, 'phase6-audit-report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
}

main();

/* ============================================================
   STREAMING IMPORT + CHUNKED EXPORT (Phase 7 §22, §43-47)

   runImportStreaming: reads a JSONL source line by line (constant memory
   for the raw file), prints progress, times each stage, attaches
   form-of entries to their lemma as surface forms, then dedupes and merges
   with the curated layer exactly like runImportMulti.

   exportChunked: writes the master lexicon as static assets instead of
   one giant file:
     master/manifest.json          counts, versions, chunk list
     master/lemmas/<letter>.json   records by first letter (lowercase, NFC)
     master/forms/<letter>.json    surfaceForm -> [lemma ids], by first letter
   so an offline app can lazy-load only the chunk a search needs.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getAdapter } = require('./sourceAdapters.js');
const { normalizeWhitespace, normalizeUnicode } = require('./normalize.js');
const { qualityCheck } = require('./classify.js');
const { buildMasterRecord, stableId } = require('./masterRecord.js');
const { dedupeMasterRecords } = require('./dedupe.js');
const { mergeLayer } = require('./merge.js');
const { loadCuratedVocab } = require('./pipeline.js');

const PIPELINE_VERSION = 'phase12-1';

/* Reads the CURRENT exported master lexicon's raw (pre-toDictionaryEntry)
   records straight off its chunk files — i.e. exactly what buildMasterRecord
   produced for every lemma already in Wegweiser (Phase 6B sourced + Phase 8
   authored). This is the "existing Wegweiser master" that Phase 12 §8/§23
   requires to WIN any field-level conflict with newly imported data: it is
   fed into dedupeMasterRecords() first, so the first-seen-wins-per-field
   gap-fill logic already in dedupe.js treats it as authoritative and only
   lets new source data fill in what's actually missing. */
function loadExistingMasterRaw(masterDir){
  if(!fs.existsSync(path.join(masterDir, 'manifest.json'))) return [];
  const manifest = JSON.parse(fs.readFileSync(path.join(masterDir, 'manifest.json'), 'utf8'));
  const out = [];
  manifest.chunks.forEach(c => {
    const p = path.join(masterDir, 'lemmas', c.letter + '.json');
    if(fs.existsSync(p)) out.push(...JSON.parse(fs.readFileSync(p, 'utf8')));
  });
  return out;
}

async function runImportStreaming({ repoRoot, sourceName, inputPath, importDate, sourceVersion, existingMasterRecords = [], log = console.error, progressEvery = 50000 }){
  const adapter = getAdapter(sourceName);
  if(!adapter.parseLine) throw new Error('Adapter "' + sourceName + '" has no parseLine(); use runImportMulti');
  const inputPaths = Array.isArray(inputPath) ? inputPath : [inputPath]; // Phase 12 §3: N files = one logical source
  const t = { start: Date.now() };
  const stats = { lines: 0, malformed: 0, nonGermanOrEmpty: 0, formEntries: 0, rejected: 0, rejectedSample: [], byFile: {} };
  const records = [];
  const formsByLemma = new Map(); // normalized lemma -> Set(forms)

  for(const file of inputPaths){
    log('Reading source: ' + file);
    const fileStats = { lines: 0, formEntries: 0, lemmaCandidates: 0, rejected: 0 };
    const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of rl){
      stats.lines++; fileStats.lines++;
      const r = adapter.parseLine(line, stats.lines);
      if(r === null){ stats.nonGermanOrEmpty++; }
      else if(r.malformed){ stats.malformed++; }
      else if(r.formOf){
        stats.formEntries++; fileStats.formEntries++;
        const key = normalizeUnicode(r.formOf).toLowerCase();
        if(!formsByLemma.has(key)) formsByLemma.set(key, new Set());
        formsByLemma.get(key).add(normalizeWhitespace(r.form));
      } else {
        const lemma = normalizeWhitespace(normalizeUnicode(r.lemma));
        const raw = Object.assign({}, r, { lemma });
        const q = qualityCheck(raw);
        if(q.status === 'REJECTED'){ stats.rejected++; fileStats.rejected++; if(stats.rejectedSample.length < 20) stats.rejectedSample.push({ lemma, reasons: q.reasons, file: path.basename(file) }); }
        else { records.push(buildMasterRecord({ raw, classification: q, sourceLabel: adapter.sourceLabel, importDate })); fileStats.lemmaCandidates++; }
      }
      if(stats.lines % progressEvery === 0) log('  [' + path.basename(file) + '] processed so far: ' + fileStats.lines.toLocaleString() + ' | total across files: ' + stats.lines.toLocaleString() + ' | lemma candidates: ' + records.length.toLocaleString() + ' | form entries: ' + stats.formEntries.toLocaleString() + ' | rejected: ' + stats.rejected.toLocaleString());
    }
    stats.byFile[path.basename(file)] = fileStats;
    log('  done: ' + path.basename(file) + ' -> ' + fileStats.lines.toLocaleString() + ' lines, ' + fileStats.lemmaCandidates.toLocaleString() + ' lemma candidates, ' + fileStats.formEntries.toLocaleString() + ' form-of entries, ' + fileStats.rejected.toLocaleString() + ' rejected');
  }
  t.parse = Date.now();
  log('Parsed ' + inputPaths.length + ' file(s) in ' + ((t.parse - t.start) / 1000).toFixed(1) + 's. Deduplicating against ' + existingMasterRecords.length.toLocaleString() + ' existing Wegweiser master records...');

  // existingMasterRecords FIRST: dedupeMasterRecords keeps the first
  // occurrence's fields and only gap-fills from later ones, so existing
  // Wegweiser data is never overwritten by the newly imported source —
  // only enriched where it was genuinely missing something (Phase 12 §8/§23).
  const { records: deduped, stats: dedupeStats } = dedupeMasterRecords(existingMasterRecords.concat(records));
  t.dedupe = Date.now();

  // attach form-of entries to lemmas (any POS of that spelling)
  let attached = 0, orphanForms = 0;
  const byLemmaKey = new Map();
  deduped.forEach(rec => { const k = rec.lemma.toLowerCase(); (byLemmaKey.get(k) || byLemmaKey.set(k, []).get(k)).push(rec); });
  formsByLemma.forEach((set, key) => {
    const targets = byLemmaKey.get(key);
    if(!targets){ orphanForms += set.size; return; }
    targets.forEach(rec => { rec.surfaceForms = Array.from(new Set([...(rec.surfaceForms || []), ...set])); });
    attached += set.size;
  });

  log('Merging with curated Wegweiser layer...');
  const curated = loadCuratedVocab(repoRoot);
  const { enrichedVocab, dictionaryOnly, stats: mergeStats } = mergeLayer(curated, deduped);
  t.merge = Date.now();

  const byWordType = {}; const byQuality = { VALID: 0, WARNING: 0 };
  let formTotal = 0, withIpa = 0, withExamples = 0, multiSense = 0, withGloss = 0;
  deduped.forEach(r => {
    byWordType[r.wordType] = (byWordType[r.wordType] || 0) + 1;
    byQuality[r.quality.status] = (byQuality[r.quality.status] || 0) + 1;
    formTotal += (r.surfaceForms || []).length;
    if(r.pronunciation) withIpa++;
    if((r.examples || []).length) withExamples++;
    if((r.senses || []).length > 1) multiSense++;
    if((r.meanings || []).length) withGloss++;
  });

  const existingIds = new Set(existingMasterRecords.map(r => r.id));
  const newLemmaCount = deduped.filter(r => !existingIds.has(r.id)).length;
  const byCefr = {}; deduped.forEach(r => { byCefr[r.cefr || 'unknown'] = (byCefr[r.cefr || 'unknown'] || 0) + 1; });

  const report = {
    pipelineVersion: PIPELINE_VERSION, source: { name: sourceName, label: adapter.sourceLabel, version: sourceVersion || 'unspecified', importDate, files: inputPaths.map(p=>path.basename(p)) },
    raw: { lines: stats.lines, malformed: stats.malformed, nonGermanOrEmpty: stats.nonGermanOrEmpty, formOfEntries: stats.formEntries, byFile: stats.byFile },
    rejected: { count: stats.rejected, sample: stats.rejectedSample },
    dedupe: dedupeStats,
    forms: { attachedToLemmas: attached, orphanFormsWithNoLemma: orphanForms, totalSurfaceForms: formTotal },
    masterLexicon: { totalLemmas: deduped.length, existingBefore: existingMasterRecords.length, newLemmasThisImport: newLemmaCount,
      byWordType, byQuality, byCefr, withGloss, withIpa, withExamples, withMultipleSenses: multiSense },
    mergeWithCurated: { curatedBefore: curated.length, curatedAfter: enrichedVocab.length, enrichedCount: mergeStats.enrichedCount, dictionaryOnlyCount: mergeStats.dictionaryOnlyCount },
    timingSeconds: { parse: (t.parse - t.start) / 1000, dedupe: (t.dedupe - t.parse) / 1000, merge: (t.merge - t.dedupe) / 1000 },
  };
  return { masterLexicon: deduped, enrichedVocab, dictionaryOnly, report };
}

function letterOf(s){
  const c = normalizeUnicode(s).charAt(0).toLowerCase();
  return /[a-zäöüß]/.test(c) ? c : '_';
}

function exportChunked(masterLexicon, outDir, meta){
  const lemDir = path.join(outDir, 'lemmas'), formDir = path.join(outDir, 'forms');
  fs.mkdirSync(lemDir, { recursive: true }); fs.mkdirSync(formDir, { recursive: true });
  const lem = {}, frm = {};
  masterLexicon.forEach(r => {
    (lem[letterOf(r.lemma)] = lem[letterOf(r.lemma)] || []).push(r);
    [r.lemma, ...(r.surfaceForms || [])].forEach(f => {
      const l = letterOf(f); frm[l] = frm[l] || {};
      const k = normalizeUnicode(f).toLowerCase();
      (frm[l][k] = frm[l][k] || []);
      if(!frm[l][k].includes(r.id)) frm[l][k].push(r.id);
    });
  });
  const chunks = [];
  Object.keys(lem).sort().forEach(l => {
    lem[l].sort((a, b) => a.lemma.localeCompare(b.lemma, 'de'));
    fs.writeFileSync(path.join(lemDir, l + '.json'), JSON.stringify(lem[l]));
    fs.writeFileSync(path.join(formDir, l + '.json'), JSON.stringify(frm[l] || {}));
    chunks.push({ letter: l, lemmas: lem[l].length });
  });
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(Object.assign({ totalLemmas: masterLexicon.length, chunks }, meta), null, 2));
  return chunks;
}

module.exports = { runImportStreaming, exportChunked, loadExistingMasterRaw, PIPELINE_VERSION };

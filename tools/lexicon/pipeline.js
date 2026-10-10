/* ============================================================
   IMPORT PIPELINE (Phase 6 spec §6, §52-54, §64)

     read source data → parse → normalize → classify/quality-filter →
     deduplicate → build master records → merge with curated vocab →
     produce normalized dataset + audit report

   Raw input is never mutated (spec §5) — this module only reads it.
   Every stage is a pure function in its own file; this file just wires
   them together so each piece stays independently testable.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const { getAdapter } = require('./sourceAdapters.js');
const { normalizeWhitespace, normalizeUnicode } = require('./normalize.js');
const { classifyWordType, qualityCheck } = require('./classify.js');
const { buildMasterRecord } = require('./masterRecord.js');
const { dedupeMasterRecords } = require('./dedupe.js');
const { mergeLayer } = require('./merge.js');

function loadCuratedVocab(repoRoot){
  const files = [
    'src/content/vocabulary.core.js',
    'src/content/vocabulary.upper.js',
    'src/content/vocabulary.expansion.js',
    'src/content/vocabulary.expansion2.js',
  ];
  let vocab = [];
  files.forEach(f => {
    try {
      const mod = require(path.join(repoRoot, f));
      const arr = mod.VOCAB_CORE || mod.VOCAB_UPPER || mod.VOCAB_EXPANSION || mod.VOCAB_EXPANSION2 || [];
      vocab = vocab.concat(arr);
    } catch (e) { /* file optional in a minimal test fixture */ }
  });
  return vocab;
}

/* Runs one or more sources through parse -> normalize -> classify, pooling
   their classified records before a single shared dedupe/merge pass — so
   the SAME lemma coming from two different sources (spec §49, "multi-
   source architecture") collapses into one master record instead of two,
   with dedupeMasterRecords' existing gap-fill-only logic arbitrating
   between them by source order (first source given wins any conflict,
   spec §50 "deterministic priority rule" — document the order you pass). */
function runImportMulti({ repoRoot, sources, importDate }){
  const auditIn = { totalSourceRows: 0, bySource: {} };
  const classifiedRecords = [];
  const rejected = [];
  const sourceLabels = [];

  sources.forEach(({ sourceName, inputPath }) => {
    const adapter = getAdapter(sourceName);
    const rawText = fs.readFileSync(inputPath, 'utf8');
    const rawRecords = adapter.parse(rawText);
    auditIn.totalSourceRows += rawRecords.length;
    auditIn.bySource[sourceName] = rawRecords.length;
    sourceLabels.push(adapter.sourceLabel);

    rawRecords.forEach(raw => {
      const cleanedLemma = normalizeWhitespace(normalizeUnicode(raw.lemma));
      const withCleanLemma = Object.assign({}, raw, { lemma: cleanedLemma });
      const classification = qualityCheck(withCleanLemma);
      if(classification.status === 'REJECTED'){
        rejected.push({ lemma: cleanedLemma, source: sourceName, reasons: classification.reasons });
        return;
      }
      classifiedRecords.push(
        buildMasterRecord({ raw: withCleanLemma, classification, sourceLabel: adapter.sourceLabel, importDate })
      );
    });
  });

  const { records: dedupedRecords, stats: dedupeStats } = dedupeMasterRecords(classifiedRecords);

  const curatedVocab = loadCuratedVocab(repoRoot);
  const { enrichedVocab, dictionaryOnly, stats: mergeStats } = mergeLayer(curatedVocab, dedupedRecords);

  const byWordType = {};
  const byQuality = { VALID: 0, WARNING: 0, REJECTED: rejected.length };
  dedupedRecords.forEach(r => {
    byWordType[r.wordType] = (byWordType[r.wordType] || 0) + 1;
    byQuality[r.quality.status] = (byQuality[r.quality.status] || 0) + 1;
  });

  const report = {
    sources: sources.map((s, i) => ({ name: s.sourceName, label: sourceLabels[i], importDate })),
    rawDataset: auditIn,
    rejected: { count: rejected.length, sample: rejected.slice(0, 20) },
    dedupe: dedupeStats,
    masterLexicon: {
      totalLemmas: dedupedRecords.length,
      byWordType,
      byQuality,
    },
    mergeWithCurated: {
      curatedBefore: curatedVocab.length,
      curatedAfter: enrichedVocab.length, // enrichment never adds/removes curated entries, only fills fields
      enrichedCount: mergeStats.enrichedCount,
      dictionaryOnlyCount: mergeStats.dictionaryOnlyCount,
      skippedRejectedDuringMerge: mergeStats.skippedRejected,
    },
  };

  return { masterLexicon: dedupedRecords, enrichedVocab, dictionaryOnly, report };
}

/* Single-source convenience wrapper — kept because most runs (and all of
   Phase 6A's tests) only ever use one source at a time. */
function runImport({ repoRoot, sourceName, inputPath, importDate }){
  return runImportMulti({ repoRoot, sources: [{ sourceName, inputPath }], importDate });
}

module.exports = { runImport, runImportMulti, loadCuratedVocab };

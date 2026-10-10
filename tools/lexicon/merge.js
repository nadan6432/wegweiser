/* ============================================================
   MERGE STRATEGY (Phase 6 spec §24, §56-59, §72)

   Two different things happen here and they must never be conflated:

   1. ENRICHMENT of existing curated learning vocabulary (the 705 in
      src/content/vocabulary.*.js) with lexical fields it's missing
      (gender/article/plural/case forms) — curated data always wins,
      this only fills gaps, never overwrites (spec §24 priority list,
      §59 "curated data has priority").

   2. DICTIONARY-ONLY records: everything in the master lexicon that has
      no curated counterpart. These are returned separately and must
      NEVER be spliced into VOCAB / the learning arrays automatically
      (spec §72 "must not automatically enter daily plan/SRS/lessons").
      A future "Add to Learning" action is what promotes one of these
      into the curated layer, using the SAME stable ID (spec §57) so a
      learner's favorite/SRS record set up against a dictionary-only
      word survives the promotion.

   Existing curated IDs (v_*) are never touched or replaced — merging
   never resets progress keyed on them (spec §56).
   ============================================================ */
'use strict';

const Schema = require('../../src/core/schema.js');
const { dedupeKey } = require('./normalize.js');

function curatedKey(v){
  return dedupeKey(v.lemma || v.de, Schema.canonicalWordType(v.type));
}

function mergeLayer(curatedVocab, masterRecords){
  const curatedByKey = new Map();
  curatedVocab.forEach(v => curatedByKey.set(curatedKey(v), v));

  const enriched = curatedVocab.map(v => Object.assign({}, v)); // never mutate the originals in place
  const enrichedByKey = new Map();
  enriched.forEach(v => enrichedByKey.set(curatedKey(v), v));

  const dictionaryOnly = [];
  const stats = { enrichedCount: 0, dictionaryOnlyCount: 0, skippedRejected: 0 };

  masterRecords.forEach(rec => {
    if(rec.quality.status === 'REJECTED'){ stats.skippedRejected++; return; }

    const match = enrichedByKey.get(rec.normalizedLemma);
    if(match){
      // Fill gaps only. Learner-authored fields (en, ex_de/ex_en,
      // translations, commonMistakes, lessonIds, level, senses) are
      // never touched here — this list is deliberately an allow-list
      // of purely lexical/grammatical fields, not a generic merge.
      if(!match.article && rec.article) match.article = rec.article;
      if(!match.plural && rec.plural) match.plural = rec.plural;
      if(!match.forms && rec.forms) match.forms = rec.forms;
      match.meta = match.meta || {};
      match.meta.lexiconSources = (match.meta.lexiconSources || []).includes(rec.provenance.sourceName)
        ? match.meta.lexiconSources
        : (match.meta.lexiconSources || []).concat(rec.provenance.sourceName);
      stats.enrichedCount++;
    } else {
      dictionaryOnly.push(Object.assign({}, rec, { dictionaryOnly: true, learningStatus: 'not-added' }));
      stats.dictionaryOnlyCount++;
    }
  });

  return { enrichedVocab: enriched, dictionaryOnly, stats };
}

module.exports = { mergeLayer, curatedKey };

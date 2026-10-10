/* ============================================================
   NORMALIZATION (Phase 6 spec §19)
   Unicode NFC, whitespace collapsing, and the dedup key used across
   the pipeline. Deliberately separate from classify.js: normalization
   never decides what something IS, only what it LOOKS like once cleaned.
   ============================================================ */
'use strict';

function normalizeUnicode(s){
  return String(s == null ? '' : s).normalize('NFC');
}

function normalizeWhitespace(s){
  return normalizeUnicode(s).replace(/\s+/g, ' ').trim();
}

/* Strips a leading article (der/die/das) the way registry.js's normKey
   already does for the existing VOCAB merge, so the two dedup notions
   stay consistent instead of drifting apart. */
function stripArticle(s){
  return normalizeWhitespace(s).replace(/^(der|die|das)\s+/i, '');
}

/* The key used to decide "is this the same lemma as something we
   already have" — case-folded, article-stripped, punctuation-stripped.
   NOT the same as the display lemma, which keeps its original casing
   (German nouns are capitalized; verbs/adjectives are not). */
function dedupeKey(lemma, wordType){
  const base = stripArticle(lemma).toLowerCase().replace(/[.,!?;:'"()]/g, '');
  return wordType ? base + '::' + wordType : base;
}

module.exports = { normalizeUnicode, normalizeWhitespace, stripArticle, dedupeKey };

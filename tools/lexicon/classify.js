/* ============================================================
   CLASSIFICATION (Phase 6 spec §10, §39, §40)
   Maps a source's own POS labels onto Wegweiser's canonical
   Schema.WORD_TYPES, and runs the quality filter that decides whether a
   raw parsed record is usable at all. Accuracy over forced coverage:
   an unrecognized source tag becomes 'unknown', never a guess dressed
   up as certainty (spec §10 "do not force uncertain records").
   ============================================================ */
'use strict';

const Schema = require('../../src/core/schema.js');

/* Source POS label -> canonical Schema word type. Extend this map (not
   the pipeline) when a new source's tag vocabulary shows up. 'unknown'
   is a real, valid outcome here, not an error. */
const SOURCE_POS_MAP = {
  substantiv: 'noun', nomen: 'noun', noun: 'noun',
  verb: 'verb',
  adjektiv: 'adjective', adjective: 'adjective',
  adverb: 'adverb',
  pronomen: 'pronoun', pronoun: 'pronoun',
  artikel: 'article', article: 'article',
  praposition: 'preposition', präposition: 'preposition', preposition: 'preposition',
  konjunktion: 'conjunction', conjunction: 'conjunction',
  partikel: 'particle', particle: 'particle',
  interjektion: 'interjection', interjection: 'interjection',
  zahlwort: 'number', numeral: 'number', number: 'number',
  determinativ: 'determiner', determiner: 'determiner',
  redewendung: 'phrase', phrase: 'phrase',
  abkurzung: 'abbreviation', abkürzung: 'abbreviation', abbreviation: 'abbreviation',

  /* Wiktextract/kaikki.org's own short "pos" codes (see SOURCE_LICENSE.md,
     the kaikki.org source) — a second, differently-shaped vocabulary from
     the same underlying Schema.WORD_TYPES target. 'name' (proper nouns),
     'suffix', 'prefix', and 'proverb' have no dedicated Wegweiser category
     yet, so they classify as 'unknown' rather than being forced into the
     nearest existing one (spec: accuracy over forced coverage). */
  noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun',
  prep: 'preposition', postp: 'preposition', conj: 'conjunction', det: 'determiner',
  intj: 'interjection', num: 'number', contraction: 'phrase',
  // Master-lexicon-only categories (not in Schema.WORD_TYPES; the learning
  // layer never sees them). Phase 7 §8.
  name: 'proper_noun', abbrev: 'abbreviation', proverb: 'phrase',
};

function classifyWordType(sourceWordType){
  const key = String(sourceWordType || '').trim().toLowerCase()
    .replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss');
  return SOURCE_POS_MAP[key] || 'unknown';
}

/* A conservative "does this look like a plausible German lexical item"
   check — NOT a full validator, just enough to reject obvious garbage
   (spec §38–§40): empty strings, control characters, digits-only, or
   scripts outside Latin+German diacritics. */
const GERMAN_LEMMA_RE = /^[A-Za-zÀ-ÖØ-öø-ÿß][A-Za-zÀ-ÖØ-öø-ÿß' .-]{0,60}$/;

function qualityCheck(rawRecord){
  const reasons = [];
  const lemma = (rawRecord.lemma || '').trim();

  if(!lemma) return { status: 'REJECTED', reasons: ['empty lemma'] };
  if(!GERMAN_LEMMA_RE.test(lemma)) return { status: 'REJECTED', reasons: ['lemma contains unexpected characters/script: "' + lemma + '"'] };
  if(/^\d+$/.test(lemma)) return { status: 'REJECTED', reasons: ['lemma is numeric only'] };

  const wordType = classifyWordType(rawRecord.sourceWordType);
  if(wordType === 'unknown') reasons.push('unrecognized source word type "' + rawRecord.sourceWordType + '" — classified as unknown, not guessed');

  if(wordType === 'noun' && !rawRecord.gender) reasons.push('noun with no gender given — article cannot be shown reliably');
  if(wordType === 'noun' && lemma[0] !== lemma[0].toUpperCase()){
    reasons.push('noun lemma is not capitalized (unusual for German)');
  }

  const status = reasons.length === 0 ? 'VALID' : 'WARNING';
  return { status, reasons, wordType };
}

module.exports = { classifyWordType, qualityCheck, SOURCE_POS_MAP, GERMAN_LEMMA_RE };

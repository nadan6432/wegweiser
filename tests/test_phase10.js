/* Phase 10 tests: the "article duplication" invariant (spec §3-9, §28) and
   pipeline repeatability (spec §21, §31 "Repeatability").
   Run with: node tests/test_phase10.js */
'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const B = require(path.join(ROOT, 'src/services/masterLexiconRuntime.js'));
const { loadCuratedVocab } = require(path.join(ROOT, 'tools/lexicon/pipeline.js'));
const { runImportMulti } = require(path.join(ROOT, 'tools/lexicon/pipeline.js'));

let passed = 0, failed = 0;
function test(name, fn){
  try{ fn(); passed++; console.log('PASS -', name); }
  catch(err){ failed++; console.log('FAIL -', name, '\n   ', err.stack||err.message); }
}

const curated = loadCuratedVocab(ROOT);
const { entries: masterEntries, manifest } = B.loadAllNode(path.join(ROOT, 'data/processed/master'));
const pool = B.mergedPool(curated, masterEntries);

function bareLemma(v){ return (v.lemma || v.de || '').replace(/^(der|die|das)\s+/i, ''); }

/* ---------------- §28: THE critical noun/article-duplication check ---------------- */

test('§28 general invariant: no entry in the pool duplicates another as "article + that entry\'s own lemma" (O(n), scales to the real ~93k-record pool)', () => {
  // Map keyed by the UNSTRIPPED lemma/de string -> record, built once (O(n)),
  // so the check below is a single O(n) pass with O(1) lookups rather than
  // the O(n^2) nested-find this test used before real bulk data existed.
  // Case-SENSITIVE on purpose: German capitalization is lexically meaningful
  // (a capitalized noun and a lowercase function word/pronoun with the same
  // letters are genuinely different lexical items — confirmed for real at
  // scale by "frau" the dialectal pronoun vs "Frau" the noun, below).
  const byRawString = new Map();
  pool.forEach(v => { byRawString.set((v.lemma||v.de||''), v); });
  const violations = [];
  pool.forEach(v => {
    if(!v.article) return;
    const combined = v.article + ' ' + bareLemma(v);
    const offender = byRawString.get(combined);
    if(offender && offender !== v) violations.push({ noun: v.id, offender: offender.id, combined });
  });
  assert.deepStrictEqual(violations.slice(0, 20), [], 'found article+noun stored as a second, separate record (showing up to 20 of ' + violations.length + ')');
});

test('§28 specific case: "Tisch" has exactly one record, never a separate "der Tisch" record', () => {
  const matches = pool.filter(v => bareLemma(v).toLowerCase() === 'tisch');
  assert.strictEqual(matches.length, 1, 'expected exactly one Tisch record');
  assert.strictEqual(matches[0].article, 'der');
  assert.strictEqual(pool.some(v => (v.lemma||v.de) === 'der Tisch'), false, 'no separate "der Tisch" record may exist');
});
test('§28 specific case: "Haus" / "das Haus"', () => {
  const matches = pool.filter(v => bareLemma(v).toLowerCase() === 'haus');
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].article, 'das');
  assert.strictEqual(pool.some(v => (v.lemma||v.de) === 'das Haus'), false);
});
test('§28 specific case: "Frau" / "die Frau" (case-sensitive: German capitalization is lexically meaningful — "frau" the archaic/dialectal indefinite pronoun is a genuine, separate homograph, not a duplicate)', () => {
  const matches = pool.filter(v => bareLemma(v) === 'Frau'); // exact case: the noun only
  assert.strictEqual(matches.length, 1, 'expected exactly one capitalized "Frau" noun record');
  assert.strictEqual(matches[0].article, 'die');
  assert.strictEqual(pool.some(v => (v.lemma||v.de) === 'die Frau'), false, 'no separate "die Frau" record may exist');
});
test('§28b real homograph found at scale: lowercase "frau" (dialectal pronoun) and capitalized "Frau" (noun) correctly coexist as different lexical items, not merged', () => {
  const pronoun = pool.find(v => v.lemma === 'frau' && v.type === 'pronoun');
  const noun = pool.find(v => bareLemma(v) === 'Frau' && v.article === 'die');
  assert.ok(pronoun && noun && pronoun.id !== noun.id, 'both the real pronoun and the real noun must exist as distinct records');
});

/* ---------------- §7: the standalone article LEXEME is a different, legitimate thing ---------------- */

test('§7: "der" exists once as its own function-word (article) lexeme, distinct from any noun', () => {
  const articleLexemes = pool.filter(v => (v.lemma||v.de) === 'der' && (v.type === 'article'));
  assert.strictEqual(articleLexemes.length, 1);
  // and it must not itself carry a noun-style `plural`/`article` metadata pair implying it's secretly a noun
  assert.ok(!articleLexemes[0].plural);
});

/* ---------------- §5: canonical schema fields (lemma, article, displayForm) ---------------- */

test('§5: a noun\'s displayForm (article + lemma) is derived correctly, and the bare lemma never includes the article', () => {
  const haus = pool.find(v => bareLemma(v).toLowerCase()==='haus');
  const displayForm = haus.article ? (haus.article + ' ' + bareLemma(haus)) : bareLemma(haus);
  assert.strictEqual(displayForm, 'das Haus');
  assert.strictEqual(/^(der|die|das)\s/i.test(haus.lemma || bareLemma(haus)), false);
});

/* ---------------- §24: orthography — umlauts/ß preserved, not the canonical spelling changed ---------------- */

test('§24: ß is preserved as the canonical spelling (never rewritten to "ss")', () => {
  const strasse = pool.find(v => bareLemma(v) === 'Straße');
  assert.ok(strasse, 'Straße must exist with its real spelling');
  assert.strictEqual(pool.some(v => bareLemma(v) === 'Strasse' && v.id !== strasse.id), false, 'no separate "Strasse" (ss) canonical duplicate should exist');
});

/* ---------------- §26: exact category counts (lemmas vs forms, never mixed) ---------------- */

test('§26: lemma count and surface-form count are reported as two SEPARATE numbers', () => {
  let formTotal = 0;
  masterEntries.forEach(e => { formTotal += (e.surfaceForms||[]).length; });
  assert.notStrictEqual(formTotal, masterEntries.length, 'sanity: forms and lemmas are different counts in this real dataset');
  assert.ok(manifest.totalLemmas === masterEntries.length, 'manifest\'s lemma count must equal the actual lemma array length');
});

/* ---------------- §21/§31: pipeline repeatability — running import twice must not grow the dataset ---------------- */

test('§31 repeatability: running the sourced-data pipeline twice on the same input yields identical output (no duplicate growth)', () => {
  const inputCsv = path.join(ROOT, 'data/raw/german-nouns-wiktionary/sample.csv');
  const inputJsonl = path.join(ROOT, 'data/raw/kaikki-wiktextract/sample.jsonl');
  const run1 = runImportMulti({ repoRoot: ROOT, sources: [
    { sourceName: 'german-nouns-csv', inputPath: inputCsv },
    { sourceName: 'wiktextract-jsonl', inputPath: inputJsonl },
  ], importDate: '2026-01-01' });
  const run2 = runImportMulti({ repoRoot: ROOT, sources: [
    { sourceName: 'german-nouns-csv', inputPath: inputCsv },
    { sourceName: 'wiktextract-jsonl', inputPath: inputJsonl },
  ], importDate: '2026-01-01' });
  assert.strictEqual(run1.masterLexicon.length, run2.masterLexicon.length);
  assert.deepStrictEqual(run1.masterLexicon.map(r=>r.id).sort(), run2.masterLexicon.map(r=>r.id).sort());
  assert.strictEqual(run1.report.mergeWithCurated.curatedAfter, run2.report.mergeWithCurated.curatedAfter, 'curated count must not grow between repeated runs');
});

test('§31 repeatability: mergedPool() is idempotent — merging the same master data in twice never doubles the pool', () => {
  const once = B.mergedPool(curated, masterEntries);
  const twice = B.mergedPool(once, masterEntries); // simulate accidentally re-running the merge against its own prior output
  // twice must not have grown by another ~5,101 entries — the entries already
  // present (now "curated" from twice's point of view) correctly suppress re-adding themselves
  assert.strictEqual(twice.length, once.length);
});

/* ---------------- final counts snapshot (printed, not just asserted, per spec §26/§32) ---------------- */

test('print exact category counts for the report (spec §26/§32)', () => {
  const Schema = require(path.join(ROOT, 'src/core/schema.js'));
  const byType = {};
  pool.forEach(v => { const t = Schema.canonicalWordType(v.type); byType[t] = (byType[t]||0)+1; });
  const byCefr = {}; pool.forEach(v => { byCefr[v.level||'unknown'] = (byCefr[v.level||'unknown']||0)+1; });
  let formTotal = 0; masterEntries.forEach(e => formTotal += (e.surfaceForms||[]).length);
  console.log('   ---- FINAL COUNTS ----');
  console.log('   curated:', curated.length, '| master lemmas:', masterEntries.length, '| merged pool:', pool.length);
  console.log('   by word class:', JSON.stringify(byType));
  console.log('   by CEFR:', JSON.stringify(byCefr));
  console.log('   surface/inflected forms (master only, separate from lemma count):', formTotal);
  assert.ok(true);
});

console.log(`\n${passed} passed, ${failed} failed (phase10 — article-duplication invariant & repeatability)`);
if(failed>0) process.exit(1);

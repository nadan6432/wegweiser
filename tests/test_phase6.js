/* Phase 6 tests: the master-lexicon import pipeline (tools/lexicon/*)
   and the runtime MasterLexiconService, run against the small real
   (README-sourced, CC BY-SA 4.0) sample — see SOURCE_LICENSE.md and
   data/raw/german-nouns-wiktionary/NOTE.md for why this is a sample
   and not the full ~90-100k-row dataset.
   Run with: node tests/test_phase6.js */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { getAdapter } = require(path.join(ROOT, 'tools/lexicon/sourceAdapters.js'));
const { normalizeWhitespace, normalizeUnicode, dedupeKey, stripArticle } = require(path.join(ROOT, 'tools/lexicon/normalize.js'));
const { classifyWordType, qualityCheck } = require(path.join(ROOT, 'tools/lexicon/classify.js'));
const { stableId, buildMasterRecord } = require(path.join(ROOT, 'tools/lexicon/masterRecord.js'));
const { dedupeMasterRecords } = require(path.join(ROOT, 'tools/lexicon/dedupe.js'));
const { mergeLayer } = require(path.join(ROOT, 'tools/lexicon/merge.js'));
const { runImport, runImportMulti } = require(path.join(ROOT, 'tools/lexicon/pipeline.js'));
const { createMasterLexiconService } = require(path.join(ROOT, 'src/services/masterLexicon.js'));

let passed = 0, failed = 0;
const pending = [];
function test(name, fn){
  try{ const r = fn(); if(r && r.then){ pending.push(r.then(() => { passed++; console.log('PASS -', name); }, err => { failed++; console.log('FAIL -', name, '\n   ', err.stack||err.message); })); return; } passed++; console.log('PASS -', name); }
  catch(err){ failed++; console.log('FAIL -', name, '\n   ', err.stack||err.message); }
}

const SAMPLE_PATH = path.join(ROOT, 'data/raw/german-nouns-wiktionary/sample.csv');
const sampleText = fs.readFileSync(SAMPLE_PATH, 'utf8');

/* ---------------- source adapter ---------------- */

test('GermanNounsCsvAdapter.canParse recognizes the real CSV header', () => {
  const adapter = getAdapter('german-nouns-csv');
  assert.ok(adapter.canParse(sampleText));
});

test('GermanNounsCsvAdapter.parse extracts lemma/genus/forms for both real sample rows', () => {
  const adapter = getAdapter('german-nouns-csv');
  const rows = adapter.parse(sampleText);
  assert.strictEqual(rows.length, 2);
  const fahrrad = rows.find(r => r.lemma === 'Fahrrad');
  assert.ok(fahrrad, 'Fahrrad row should parse');
  assert.strictEqual(fahrrad.gender, 'n');
  assert.strictEqual(fahrrad.forms['nominativ plural'], 'Fahrräder');
});

test('an unrecognized source name throws a clear error rather than silently returning nothing', () => {
  assert.throws(() => getAdapter('not-a-real-source'), /Unknown source adapter/);
});

/* ---------------- normalization ---------------- */

test('normalizeWhitespace collapses internal whitespace and trims', () => {
  assert.strictEqual(normalizeWhitespace('  der   Tisch  '), 'der Tisch');
});

test('normalizeUnicode composes to NFC so combining-mark variants compare equal', () => {
  const decomposed = 'Stra\u0303\u00dfe'.normalize('NFD'); // deliberately mixed form
  assert.strictEqual(normalizeUnicode(decomposed), normalizeUnicode(decomposed).normalize('NFC'));
});

test('dedupeKey strips a leading article and folds case, but keeps distinct word types apart', () => {
  assert.strictEqual(dedupeKey('der Tisch', 'noun'), dedupeKey('Tisch', 'noun'));
  assert.strictEqual(dedupeKey('TISCH', 'noun'), dedupeKey('tisch', 'noun'));
  assert.notStrictEqual(dedupeKey('Bank', 'noun'), dedupeKey('Bank', 'verb'));
});

test('stripArticle only strips a leading article, never a mid-word match', () => {
  assert.strictEqual(stripArticle('der Tisch'), 'Tisch');
  assert.strictEqual(stripArticle('Dermatologe'), 'Dermatologe');
});

/* ---------------- classification & quality filter ---------------- */

test('classifyWordType maps known German POS tags onto Schema.WORD_TYPES', () => {
  assert.strictEqual(classifyWordType('Substantiv'), 'noun');
  assert.strictEqual(classifyWordType('Verb'), 'verb');
  assert.strictEqual(classifyWordType('Präposition'), 'preposition');
});

test('classifyWordType returns "unknown" rather than guessing for an unrecognized tag (spec §10)', () => {
  assert.strictEqual(classifyWordType('Quatschwort'), 'unknown');
});

test('qualityCheck rejects an empty lemma', () => {
  const r = qualityCheck({ lemma: '', sourceWordType: 'Substantiv' });
  assert.strictEqual(r.status, 'REJECTED');
});

test('qualityCheck rejects garbage/non-German-script lemmas without crashing', () => {
  const r = qualityCheck({ lemma: '12345', sourceWordType: 'Substantiv' });
  assert.strictEqual(r.status, 'REJECTED');
});

test('qualityCheck accepts a clean, capitalized, gendered noun as VALID', () => {
  const r = qualityCheck({ lemma: 'Fahrrad', sourceWordType: 'Substantiv', gender: 'n' });
  assert.strictEqual(r.status, 'VALID');
});

test('qualityCheck flags (does not reject) a noun missing gender, as WARNING', () => {
  const r = qualityCheck({ lemma: 'Fahrrad', sourceWordType: 'Substantiv', gender: null });
  assert.strictEqual(r.status, 'WARNING');
});

/* ---------------- master record & stable IDs ---------------- */

test('stableId is deterministic across repeated calls (spec §57 — no random/positional IDs)', () => {
  const a = stableId('Fahrrad', 'noun');
  const b = stableId('Fahrrad', 'noun');
  assert.strictEqual(a, b);
  assert.strictEqual(a, 'lex_fahrrad_noun');
});

test('stableId keeps the same lemma apart across different word types', () => {
  assert.notStrictEqual(stableId('Bank', 'noun'), stableId('Bank', 'verb'));
});

test('buildMasterRecord never fabricates CEFR (spec §25)', () => {
  const rec = buildMasterRecord({
    raw: { lemma: 'Fahrrad', gender: 'n', forms: {}, sourceName: 'test', sourceId: 'x' },
    classification: { status: 'VALID', reasons: [], wordType: 'noun' },
    sourceLabel: 'test', importDate: '2026-01-01',
  });
  assert.strictEqual(rec.cefr, 'unknown');
});

test('buildMasterRecord derives article from gender without inventing gender for non-nouns', () => {
  const noun = buildMasterRecord({
    raw: { lemma: 'Fahrrad', gender: 'n', forms: {}, sourceName: 't', sourceId: 'x' },
    classification: { status: 'VALID', reasons: [], wordType: 'noun' }, sourceLabel: 't', importDate: 'd',
  });
  assert.strictEqual(noun.article, 'das');
  const verb = buildMasterRecord({
    raw: { lemma: 'gehen', gender: null, forms: {}, sourceName: 't', sourceId: 'x' },
    classification: { status: 'VALID', reasons: [], wordType: 'verb' }, sourceLabel: 't', importDate: 'd',
  });
  assert.strictEqual(verb.article, '');
});

/* ---------------- dedupe ---------------- */

test('dedupeMasterRecords collapses same lemma+wordType and fills gaps from the duplicate rather than overwriting', () => {
  const a = buildMasterRecord({
    raw: { lemma: 'Fahrrad', gender: null, forms: { 'nominativ singular': 'Fahrrad' }, sourceName: 't', sourceId: '1' },
    classification: { status: 'WARNING', reasons: ['no gender'], wordType: 'noun' }, sourceLabel: 't', importDate: 'd',
  });
  const b = buildMasterRecord({
    raw: { lemma: 'Fahrrad', gender: 'n', forms: { 'nominativ plural': 'Fahrräder' }, sourceName: 't', sourceId: '2' },
    classification: { status: 'VALID', reasons: [], wordType: 'noun' }, sourceLabel: 't', importDate: 'd',
  });
  const { records, stats } = dedupeMasterRecords([a, b]);
  assert.strictEqual(records.length, 1);
  assert.strictEqual(stats.duplicateRows, 1);
  assert.strictEqual(records[0].gender, 'n', 'gap should be filled from the second occurrence');
  assert.strictEqual(records[0].forms.nominativ.singular, 'Fahrrad', 'first-seen value must not be overwritten');
  assert.strictEqual(records[0].forms.nominativ.plural, 'Fahrräder', 'gap-fill from second record should still land');
});

/* ---------------- merge safety (the part that must never regress) ---------------- */

test('mergeLayer never overwrites an existing curated field, only fills empty ones', () => {
  const curated = [{ id: 'v_haus', de: 'das Haus', lemma: 'Haus', article: 'das', plural: 'die Häuser', type: 'noun',
    translations: { ur: 'گھر', ps: 'کور' }, level: 'A1' }];
  const masterRec = buildMasterRecord({
    raw: { lemma: 'Haus', gender: 'n', forms: { 'nominativ plural': 'FAKE_SHOULD_NOT_APPEAR' }, sourceName: 't', sourceId: 'x' },
    classification: { status: 'VALID', reasons: [], wordType: 'noun' }, sourceLabel: 't', importDate: 'd',
  });
  const { enrichedVocab, stats } = mergeLayer(curated, [masterRec]);
  assert.strictEqual(stats.enrichedCount, 1);
  assert.strictEqual(enrichedVocab[0].plural, 'die Häuser', 'curated plural must win over the source');
  assert.strictEqual(enrichedVocab[0].translations.ur, 'گھر', 'curated Urdu translation must be untouched');
  assert.strictEqual(enrichedVocab[0].translations.ps, 'کور', 'curated Pashto translation must be untouched');
  assert.strictEqual(enrichedVocab[0].level, 'A1', 'CEFR level is learner metadata and must never come from the lexicon merge');
});

test('mergeLayer backfills a genuinely missing lexical field on a curated entry', () => {
  const curated = [{ id: 'v_test', de: 'der Test', lemma: 'Test', article: '', plural: '', type: 'noun', translations: {} }];
  const masterRec = buildMasterRecord({
    raw: { lemma: 'Test', gender: 'm', forms: { 'nominativ plural': 'Tests' }, sourceName: 't', sourceId: 'x' },
    classification: { status: 'VALID', reasons: [], wordType: 'noun' }, sourceLabel: 't', importDate: 'd',
  });
  const { enrichedVocab } = mergeLayer(curated, [masterRec]);
  assert.strictEqual(enrichedVocab[0].article, 'der');
  assert.strictEqual(enrichedVocab[0].plural, 'Tests');
});

test('mergeLayer routes a lemma with no curated counterpart to dictionaryOnly, never into the curated array', () => {
  const curated = [{ id: 'v_haus', de: 'das Haus', lemma: 'Haus', article: 'das', plural: 'die Häuser', type: 'noun', translations: {} }];
  const masterRec = buildMasterRecord({
    raw: { lemma: 'Fahrrad', gender: 'n', forms: {}, sourceName: 't', sourceId: 'x' },
    classification: { status: 'VALID', reasons: [], wordType: 'noun' }, sourceLabel: 't', importDate: 'd',
  });
  const { enrichedVocab, dictionaryOnly } = mergeLayer(curated, [masterRec]);
  assert.strictEqual(enrichedVocab.length, 1, 'curated array size must not change from merging');
  assert.strictEqual(dictionaryOnly.length, 1);
  assert.strictEqual(dictionaryOnly[0].dictionaryOnly, true);
});

test('mergeLayer skips REJECTED records entirely (never enriches or dictionary-onlys them)', () => {
  const rejected = Object.assign(
    buildMasterRecord({
      raw: { lemma: 'xxxx', gender: null, forms: {}, sourceName: 't', sourceId: 'x' },
      classification: { status: 'REJECTED', reasons: ['garbage'], wordType: 'unknown' }, sourceLabel: 't', importDate: 'd',
    })
  );
  const { dictionaryOnly, stats } = mergeLayer([], [rejected]);
  assert.strictEqual(dictionaryOnly.length, 0);
  assert.strictEqual(stats.skippedRejected, 1);
});

/* ---------------- full pipeline against the real sample ---------------- */

test('runImport end-to-end against the real sample.csv preserves existing curated count exactly', () => {
  const { report } = runImport({ repoRoot: ROOT, sourceName: 'german-nouns-csv', inputPath: SAMPLE_PATH, importDate: '2026-01-01' });
  assert.strictEqual(report.rawDataset.totalSourceRows, 2);
  assert.strictEqual(report.rejected.count, 0);
  assert.strictEqual(report.mergeWithCurated.curatedBefore, report.mergeWithCurated.curatedAfter,
    'importing must never add to or remove from the curated array size');
});

test('runImport reports lemmas and word-type breakdown distinctly (spec §64)', () => {
  const { report } = runImport({ repoRoot: ROOT, sourceName: 'german-nouns-csv', inputPath: SAMPLE_PATH, importDate: '2026-01-01' });
  assert.strictEqual(report.masterLexicon.totalLemmas, 2);
  assert.strictEqual(report.masterLexicon.byWordType.noun, 2);
});

/* ---------------- MasterLexiconService ---------------- */

test('MasterLexiconService.counts reports lemmas and inflected forms SEPARATELY (spec §67-68)', () => {
  const { masterLexicon, dictionaryOnly } = runImport({ repoRoot: ROOT, sourceName: 'german-nouns-csv', inputPath: SAMPLE_PATH, importDate: 'd' });
  const svc = createMasterLexiconService({ masterLexicon, dictionaryOnly });
  const c = svc.counts();
  assert.strictEqual(c.masterLexiconLemmas, 2);
  assert.ok(c.inflectedForms > c.masterLexiconLemmas, 'forms count should exceed lemma count, and must be a separate number');
  assert.strictEqual(c.byCefr.unknown, 2, 'CEFR must default to a visible "unknown" bucket, never fabricated (spec §25/§36)');
});

test('MasterLexiconService.lookup resolves an inflected form back to its lemma (spec §16/§71)', () => {
  const { masterLexicon, dictionaryOnly } = runImport({ repoRoot: ROOT, sourceName: 'german-nouns-csv', inputPath: SAMPLE_PATH, importDate: 'd' });
  const svc = createMasterLexiconService({ masterLexicon, dictionaryOnly });
  const result = svc.lookup('Fahrrädern'); // dative plural, not the lemma itself
  assert.ok(result.formOf, 'an inflected form should resolve to its lemma record');
  assert.strictEqual(result.formOf.lemma, 'Fahrrad');
  assert.strictEqual(result.exact, null, 'the inflected form itself must not be treated as its own lemma (spec §16)');
});

test('MasterLexiconService.lookup finds an exact lemma directly', () => {
  const { masterLexicon, dictionaryOnly } = runImport({ repoRoot: ROOT, sourceName: 'german-nouns-csv', inputPath: SAMPLE_PATH, importDate: 'd' });
  const svc = createMasterLexiconService({ masterLexicon, dictionaryOnly });
  const result = svc.lookup('Stein');
  assert.ok(result.exact);
  assert.strictEqual(result.exact.article, 'der');
});

test('MasterLexiconService.getAddableRecord refuses a REJECTED-quality record (spec §73)', () => {
  const rejectedRec = Object.assign({}, buildMasterRecord({
    raw: { lemma: 'zzz', gender: null, forms: {}, sourceName: 't', sourceId: 'x' },
    classification: { status: 'REJECTED', reasons: ['bad'], wordType: 'unknown' }, sourceLabel: 't', importDate: 'd',
  }));
  const svc = createMasterLexiconService({ masterLexicon: [], dictionaryOnly: [rejectedRec] });
  assert.strictEqual(svc.getAddableRecord(rejectedRec.id), null);
});

test('MasterLexiconService.azBrowse groups by first letter and sorts (German collation)', () => {
  const { masterLexicon, dictionaryOnly } = runImport({ repoRoot: ROOT, sourceName: 'german-nouns-csv', inputPath: SAMPLE_PATH, importDate: 'd' });
  const svc = createMasterLexiconService({ masterLexicon, dictionaryOnly });
  const fLetter = svc.azBrowse('F');
  assert.strictEqual(fLetter.length, 1);
  assert.strictEqual(fLetter[0].lemma, 'Fahrrad');
});

/* ---------------- second source: kaikki.org Wiktextract (broad POS) ---------------- */

const KAIKKI_SAMPLE_PATH = path.join(ROOT, 'data/raw/kaikki-wiktextract/sample.jsonl');
const kaikkiText = fs.readFileSync(KAIKKI_SAMPLE_PATH, 'utf8');

test('WiktextractJsonlAdapter.canParse recognizes the real kaikki.org JSONL shape', () => {
  const adapter = getAdapter('wiktextract-jsonl');
  assert.ok(adapter.canParse(kaikkiText));
});

test('WiktextractJsonlAdapter.parse extracts a noun (Wiki) and a verb (gehen) from real kaikki.org data', () => {
  const adapter = getAdapter('wiktextract-jsonl');
  const rows = adapter.parse(kaikkiText);
  assert.strictEqual(rows.length, 2);
  const wiki = rows.find(r => r.lemma === 'Wiki');
  const gehen = rows.find(r => r.lemma === 'gehen');
  assert.strictEqual(wiki.sourceWordType, 'noun');
  assert.strictEqual(wiki.gender, 'n');
  assert.strictEqual(gehen.sourceWordType, 'verb');
  assert.ok(gehen.senses.length >= 2, 'gehen has multiple real senses (polysemy, spec §21)');
  assert.strictEqual(gehen.senses[0].example.en, 'I saw the children walk/go across the street.');
});

test('WiktextractJsonlAdapter never fabricates gender for a verb (no gender tag present)', () => {
  const adapter = getAdapter('wiktextract-jsonl');
  const gehen = adapter.parse(kaikkiText).find(r => r.lemma === 'gehen');
  assert.strictEqual(gehen.gender, null);
});

test('buildMasterRecord carries real senses/meanings/examples/pronunciation from kaikki.org data, never fabricated', () => {
  const raw = getAdapter('wiktextract-jsonl').parse(kaikkiText).find(r => r.lemma === 'gehen');
  const classification = { status: 'VALID', reasons: [], wordType: 'verb' };
  const rec = buildMasterRecord({ raw, classification, sourceLabel: 'kaikki.org', importDate: 'd' });
  assert.ok(rec.meanings.includes('to go, to walk'));
  assert.ok(rec.pronunciation.includes('ɡeː'), 'real IPA should be preserved verbatim');
  assert.strictEqual(rec.examples[0].de, 'Ich sah die Kinder über die Straße gehen.');
  assert.strictEqual(rec.cefr, 'unknown', 'still never fabricated, even with a richer source');
});

test('runImportMulti pools two different real sources into one shared dedupe/merge pass (spec §49)', () => {
  const { report, masterLexicon } = runImportMulti({
    repoRoot: ROOT,
    sources: [
      { sourceName: 'german-nouns-csv', inputPath: SAMPLE_PATH },
      { sourceName: 'wiktextract-jsonl', inputPath: KAIKKI_SAMPLE_PATH },
    ],
    importDate: '2026-01-01',
  });
  assert.strictEqual(report.sources.length, 2);
  assert.strictEqual(report.rawDataset.totalSourceRows, 4);
  assert.strictEqual(masterLexicon.length, 4, 'no accidental collision between the two sources\' lemmas here');
  assert.deepStrictEqual(report.rawDataset.bySource, { 'german-nouns-csv': 2, 'wiktextract-jsonl': 2 });
});

test('runImportMulti still safely enriches curated "gehen" from real data without touching curated fields', () => {
  const { enrichedVocab } = runImportMulti({
    repoRoot: ROOT,
    sources: [{ sourceName: 'wiktextract-jsonl', inputPath: KAIKKI_SAMPLE_PATH }],
    importDate: 'd',
  });
  const gehen = enrichedVocab.find(v => v.lemma === 'gehen');
  assert.ok(gehen, 'curated gehen must still be present');
  assert.strictEqual(gehen.ex_de, 'Ich gehe zu Fuß.', 'curated example must survive enrichment untouched');
  assert.ok(gehen.forms && gehen.forms.praesens, 'curated forms (already present) must not be replaced by the source\'s');
});


/* ---------------- Phase 7: streaming importer / form-of handling ----------------
   The lines below are inline SHAPE fixtures for parser unit tests only. They
   are not dictionary data, are never written to data/, and are not counted. */
const os = require('os');
const { runImportStreaming, exportChunked } = require(path.join(ROOT, 'tools/lexicon/streaming.js'));
const FIX = [
  fs.readFileSync(KAIKKI_SAMPLE_PATH, 'utf8').trim(),
  JSON.stringify({ word: 'ging', pos: 'verb', lang_code: 'de', senses: [{ glosses: ['inflection of gehen'], tags: ['form-of', 'past'], form_of: [{ word: 'gehen' }] }] }),
  JSON.stringify({ word: 'chien', pos: 'noun', lang_code: 'fr', senses: [{ glosses: ['dog'] }] }),
  '{not json',
  ''
].join('\n');

test('parseLine treats an all-form_of entry as a FORM of its lemma, not a lemma (spec §7)', () => {
  const a = getAdapter('wiktextract-jsonl');
  const r = a.parseLine(FIX.split('\n')[2], 3);
  assert.strictEqual(r.formOf, 'gehen'); assert.strictEqual(r.form, 'ging'); assert.ok(r.tags.includes('past'));
  assert.strictEqual(r.lemma, undefined);
});
test('parseLine skips non-German entries and flags malformed JSON without throwing', () => {
  const a = getAdapter('wiktextract-jsonl');
  assert.strictEqual(a.parseLine(FIX.split('\n')[3], 4), null);
  assert.strictEqual(a.parseLine('{not json', 5).malformed, true);
});
test('runImportStreaming: lemmas exclude form entries; "ging" becomes a surface form of gehen; counts reported separately', async () => {
  const f = path.join(os.tmpdir(), 'wg_fix.jsonl'); fs.writeFileSync(f, FIX);
  const { masterLexicon, report } = await runImportStreaming({ repoRoot: ROOT, sourceName: 'wiktextract-jsonl', inputPath: f, importDate: 'd', log: () => {} });
  assert.strictEqual(report.masterLexicon.totalLemmas, 2, 'Wiki + gehen only');
  assert.strictEqual(report.raw.formOfEntries, 1); assert.strictEqual(report.raw.malformed, 1);
  const gehen = masterLexicon.find(r => r.lemma === 'gehen');
  assert.ok(gehen.surfaceForms.includes('ging')); assert.ok(gehen.surfaceForms.includes('gegangen'));
  assert.strictEqual(gehen.sourcePos, 'verb'); assert.strictEqual(gehen.layer, 'MASTER_DICTIONARY');
  assert.strictEqual(report.masterLexicon.byCefr.unknown, 2); // Phase 12: real per-value CEFR counts replace the old hardcoded {UNKNOWN: total} shape
});
test('exportChunked writes a manifest plus per-letter lemma and form chunks; form index resolves ging -> gehen', async () => {
  const f = path.join(os.tmpdir(), 'wg_fix2.jsonl'); fs.writeFileSync(f, FIX);
  const { masterLexicon } = await runImportStreaming({ repoRoot: ROOT, sourceName: 'wiktextract-jsonl', inputPath: f, importDate: 'd', log: () => {} });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'wgm-'));
  exportChunked(masterLexicon, out, {});
  const man = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  assert.strictEqual(man.totalLemmas, 2);
  const forms = JSON.parse(fs.readFileSync(path.join(out, 'forms/g.json'), 'utf8'));
  assert.deepStrictEqual(forms['ging'], [masterLexicon.find(r => r.lemma === 'gehen').id]);
});
test('homographs: same lemma+POS from two entries keeps both entries\' senses (spec §13/§20)', () => {
  const mk = g => buildMasterRecord({ raw: { lemma: 'Bank', gender: 'f', forms: {}, senses: [{ glosses: [g], tags: [] }], sourceName: 't', sourceId: g }, classification: { status: 'VALID', reasons: [], wordType: 'noun' }, sourceLabel: 't', importDate: 'd' });
  const { records } = dedupeMasterRecords([mk('bank (financial)'), mk('bench')]);
  assert.strictEqual(records.length, 1); assert.strictEqual(records[0].senses.length, 2);
});

/* ---------------- regression guard: existing 705-entry curated set is untouched ---------------- */

test('the pipeline never mutates the curated content-pack files it reads from', () => {
  const before = fs.readFileSync(path.join(ROOT, 'src/content/vocabulary.core.js'), 'utf8');
  runImport({ repoRoot: ROOT, sourceName: 'german-nouns-csv', inputPath: SAMPLE_PATH, importDate: 'd' });
  const after = fs.readFileSync(path.join(ROOT, 'src/content/vocabulary.core.js'), 'utf8');
  assert.strictEqual(before, after);
});

Promise.all(pending).then(() => {
  console.log(`\n${passed} passed, ${failed} failed (phase6 — master lexicon pipeline)`);
  if(failed>0) process.exit(1);
});

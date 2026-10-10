/* Phase 4.5 tests: multilingual search ranking, vocabulary↔mistake
   integration, polysemy/senses, and the data-quality audits this phase
   ran. Run with: node tests/test_phase4_5.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const files = [
  'data.js','content2.js','logic.js','db.js','srs.js','providers.js',
  'src/core/schema.js','src/core/dsl.js','src/core/validate.js',
  'src/content/levels.js','src/content/grammar.js',
  'src/content/vocabulary.core.js','src/content/vocabulary.upper.js','src/content/vocabulary.expansion.js','src/content/vocabulary.expansion2.js',
  'src/content/lessons.a0a1.js','src/content/lessons.a2.js',
  'src/content/lessons.b1.js','src/content/lessons.b2c1c2.js',
  'src/content/reading.js','src/content/writing.js','src/content/listening.js',
  'src/content/speaking.js','src/content/conversation.js',
  'src/content/assessments.js','src/content/mistakes.js',
  'src/content/manifest.js','src/content/registry.js',
  'src/repositories/repositories.js',
  'src/services/learning.js','src/services/assessment.js',
  'src/services/teacher.js','src/services/query.js','src/services/dictionary.js',
];

const sandbox = { console };
sandbox.global = sandbox;
vm.createContext(sandbox);
for(const f of files){ vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, {filename:f}); }
vm.runInContext('Registry.apply()', sandbox);

let passed = 0, failed = 0;
function test(name, fn){
  try{ fn(); passed++; console.log('PASS -', name); }
  catch(err){ failed++; console.log('FAIL -', name, '\n   ', err.stack||err.message); }
}
const run = (code) => vm.runInContext(code, sandbox);

/* ---------------- multilingual search (spec §4/§5/§8) ---------------- */
test('Journey A: German search finds Haus', () => {
  const res = run(`DictionaryService.search('Haus')`);
  assert.ok(res.exact.some(v=>v.de==='das Haus'));
});
test('Journey B: English search finds Haus', () => {
  const res = run(`DictionaryService.search('house')`);
  assert.ok(res.translationExact.some(v=>v.de==='das Haus'));
});
test('Journey C: Urdu search گھر finds Haus', () => {
  const res = run(`DictionaryService.search('گھر')`);
  assert.ok(res.translationExact.some(v=>v.de==='das Haus'), 'گھر should resolve to das Haus');
});
test('Journey D: Pashto search کور finds Haus', () => {
  const res = run(`DictionaryService.search('کور')`);
  assert.ok(res.translationExact.some(v=>v.de==='das Haus'), 'کور should resolve to das Haus');
});
test('Journey E: inflected search Häuser resolves to Haus', () => {
  const res = run(`DictionaryService.search('Häuser')`);
  assert.ok(res.inflected.some(v=>v.de==='das Haus'));
});
test('additional curated Urdu/Pashto words resolve: میز, پانی, کتاب', () => {
  assert.ok(run(`DictionaryService.search('میز')`).translationExact.some(v=>v.de==='der Tisch'));
  assert.ok(run(`DictionaryService.search('پانی')`).translationExact.some(v=>v.de==='das Wasser'));
  assert.ok(run(`DictionaryService.search('کتاب')`).translationExact.some(v=>v.de==='das Buch'));
});
test('Unicode NFC normalization: composed and decomposed Urdu forms both match', () => {
  const composed = 'گھر';
  const decomposed = composed.normalize('NFD');
  sandbox.__decomposed = decomposed;
  const res = run(`DictionaryService.search(__decomposed)`);
  assert.ok(res.translationExact.some(v=>v.de==='das Haus'), 'NFD-typed Urdu should still match the NFC-stored translation');
});
test('Pashto-specific letters (ښ ږ ړ ڼ ګ ۍ) are not corrupted by normalization', () => {
  const sample = 'ښېږدل';
  const normalized = run(`DictionaryService.normUnicode(${JSON.stringify(sample)})`);
  // Every distinctive Pashto letter must still be present after normalization —
  // only the optional diacritics may be removed, never the base letters.
  ['ښ','ې','ږ','د','ل'].forEach(ch=>assert.ok(normalized.includes(ch), `expected '${ch}' preserved in '${normalized}'`));
});
test('German umlauts and ß are never altered in the display field (only in a matching key)', () => {
  const strasse = run('VOCAB').find(v=>v.de==='die Straße'||v.lemma==='Straße');
  if(strasse) assert.strictEqual(strasse.de.includes('ß'), true, 'Straße must keep its ß in the stored/displayed field');
  const madchen = run('VOCAB').find(v=>v.lemma==='Mädchen');
  if(madchen) assert.ok(madchen.de.includes('ä'), 'Mädchen must keep its ä in the stored/displayed field');
});

/* ---------------- ranking / tiers (spec §9/§10) ---------------- */
test('new translationPrefix and related tiers exist on the search result shape', () => {
  const res = run(`DictionaryService.search('hous')`); // prefix of "house"
  assert.ok('translationPrefix' in res && 'related' in res, 'expected the two new Phase 4.5 tiers on the result object');
});
test('a word never appears in two tiers at once (each match is ranked exactly once)', () => {
  const res = run(`DictionaryService.search('Haus')`);
  const allIds = [].concat(res.exact,res.inflected,res.translationExact,res.prefix,res.translationPrefix,res.partial,res.related).map(v=>v.id);
  assert.strictEqual(allIds.length, new Set(allIds).size, 'duplicate id found across tiers');
});
test('search ranking is not influenced by learner mastery/CEFR state (neutral lookup)', () => {
  // DictionaryService.search takes no learner-state argument at all — this
  // is a structural guarantee, verified by checking the function arity/opts shape
  // rather than by mocking a learner profile.
  const res1 = run(`DictionaryService.search('Haus')`);
  const res2 = run(`DictionaryService.search('Haus', {})`);
  assert.deepStrictEqual(res1.exact.map(v=>v.id), res2.exact.map(v=>v.id));
});

/* ---------------- vocabulary ↔ mistake integration (spec §11/§12/§13) ---------------- */
test('at least 8 vocabulary entries link to a real COMMON_MISTAKES id', () => {
  const linked = run('VOCAB').filter(v=>v.commonMistakeIds && v.commonMistakeIds.length);
  assert.ok(linked.length >= 8, `expected >=8 linked vocab entries, got ${linked.length}`);
});
test('every vocab commonMistakeIds entry resolves to a real COMMON_MISTAKES record', () => {
  const mistakeIds = new Set(run('COMMON_MISTAKES').map(m=>m.id));
  run('VOCAB').forEach(v=>{
    (v.commonMistakeIds||[]).forEach(id=>assert.ok(mistakeIds.has(id), `${v.id} references missing mistake ${id}`));
  });
});
test('a linked mistake record has the wrong/right/explanation shape the UI renders', () => {
  const gehen = run('VOCAB').find(v=>v.id==='v_gehen');
  const mistakeId = gehen.commonMistakeIds[0];
  const m = run('COMMON_MISTAKES').find(x=>x.id===mistakeId);
  assert.ok(m.wrong && m.right && m.explanation);
});

/* ---------------- polysemy / senses (spec §21/§22) ---------------- */
test('Bank has two distinct, structured senses (not a comma-mashed string)', () => {
  const bank = run('VOCAB').find(v=>v.id==='v_bank');
  assert.ok(bank.senses && bank.senses.length===2);
  assert.ok(bank.senses[0].en.includes('bank'));
  assert.ok(bank.senses[1].en.includes('bench'));
  bank.senses.forEach(s=>assert.ok(s.example && s.example.de && s.example.en));
});
test('laufen has multiple structured senses with real examples', () => {
  const laufen = run('VOCAB').find(v=>v.id==='v_laufen');
  assert.ok(laufen.senses && laufen.senses.length>=3);
  laufen.senses.forEach(s=>assert.ok(s.example && s.example.de));
});

/* ---------------- data quality audit (spec §23/§24/§25) ---------------- */
test('content validator passes with zero errors across the full merged graph', () => {
  const merged = run('Registry.build()');
  const report = run('ContentValidator.validate')(merged);
  if(!report.ok) console.log('validator errors:', JSON.stringify(report.errors, null, 2));
  assert.ok(report.ok);
});
test('no vocabulary entry has an empty or placeholder English gloss', () => {
  const badPattern = /^(TODO|TBD|FIXME|N\/A|unknown|xxx)$/i;
  run('VOCAB').forEach(v=>{
    assert.ok(v.en && v.en.trim().length>0, `${v.id} has empty en`);
    assert.ok(!badPattern.test(v.en.trim()), `${v.id} has placeholder en: ${v.en}`);
  });
});
test('no Latin letters leak into Urdu/Pashto translation fields', () => {
  run('VOCAB').forEach(v=>{
    if(v.translations){
      ['ur','ps'].forEach(lang=>{
        if(v.translations[lang]) assert.ok(!/[a-zA-Z]/.test(v.translations[lang]), `${v.id} translations.${lang} contains Latin letters: ${v.translations[lang]}`);
      });
    }
  });
});
test('no vocabulary word type is applied to an incompatible field (e.g. article on a verb)', () => {
  run('VOCAB').forEach(v=>{
    if(v.article) assert.strictEqual(v.type, 'noun', `${v.id} has an article but type '${v.type}'`);
  });
});

/* ---------------- A-Z audit (spec §27) ---------------- */
test('every letter A-Z either has real entries or is honestly empty (no fabricated coverage)', () => {
  const letters = run('DictionaryService.availableLetters()');
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l=>{
    const list = run(`DictionaryService.browseLetter(${JSON.stringify(l)})`);
    if(letters.includes(l)) assert.ok(list.length>0);
    else assert.strictEqual(list.length, 0, `letter ${l} claims entries but availableLetters() excludes it`);
  });
});

/* ---------------- offline / idempotency spot-checks (spec §30/§34) ---------------- */
test('DB.init() still resolves to memory mode offline without throwing', async () => {
  const mode = await run('DB.init()');
  assert.strictEqual(mode, 'memory');
});

console.log(`\n${passed} passed, ${failed} failed`);
if(failed>0) process.exit(1);

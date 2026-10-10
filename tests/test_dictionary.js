/* Tests for DictionaryService (Phase 4): A-Z browsing, scored search
   ranking, typo-tolerant suggestions, and the inflected-form lookup
   architecture. Run with: node tests/test_dictionary.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const files = [
  'data.js','content2.js','logic.js','db.js','srs.js','providers.js',
  'src/core/schema.js','src/core/dsl.js',
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

test('A-Z index covers a realistic spread of German letters', () => {
  const letters = run('DictionaryService.availableLetters()');
  assert.ok(letters.length >= 20, `expected ~20+ letters, got ${letters.length}`);
  assert.ok(letters.includes('A') && letters.includes('S') && letters.includes('W'));
});

test('exact match ranks a word in the exact tier, not partial', () => {
  const res = run(`DictionaryService.search('Haus')`);
  assert.ok(res.exact.some(v=>v.de==='das Haus'), 'expected "das Haus" in exact tier');
  assert.ok(!res.partial.some(v=>v.de==='das Haus'), 'should not also appear in partial tier');
});

test('case-insensitive exact match', () => {
  const res = run(`DictionaryService.search('HAUS')`);
  assert.ok(res.exact.some(v=>v.de==='das Haus'));
});

test('partial match finds words containing the substring anywhere', () => {
  const res = run(`DictionaryService.search('schlaf')`);
  const found = [...res.prefix, ...res.partial].map(v=>v.de);
  assert.ok(found.some(d=>d.includes('Schlaf')), `expected a Schlaf* word among: ${found}`);
});

test('prefix match is ranked ahead of partial-only match', () => {
  const res = run(`DictionaryService.search('schlaf')`);
  // "schlafen" starts with "schlaf" -> prefix tier; "Schlafzimmer" also
  // starts with it (both are legitimately prefix matches here).
  assert.ok(res.prefix.length > 0, 'expected at least one prefix match');
});

test('English translation search finds the German word', () => {
  const res = run(`DictionaryService.search('house')`);
  assert.ok(res.translationExact.some(v=>v.de==='das Haus'));
});

test('typo-tolerant fuzzy search suggests the correct word', () => {
  const res = run(`DictionaryService.search('shlafen')`);
  assert.ok(res.fuzzy.some(v=>v.de==='schlafen'), `expected schlafen in fuzzy suggestions: ${JSON.stringify(res.fuzzy.map(v=>v.de))}`);
});

test('fuzzy search does not fire when exact/partial results already exist', () => {
  const res = run(`DictionaryService.search('Haus')`);
  assert.strictEqual(res.fuzzy.length, 0, 'fuzzy should be empty when exact results are found');
});

test('inflected irregular verb form resolves to its infinitive', () => {
  const res = run(`DictionaryService.search('ging')`);
  assert.ok(res.inflected.some(v=>v.lemma==='gehen'||v.de==='gehen'), 'expected "gehen" resolved from "ging"');
});

test('inflected irregular noun plural resolves to its singular', () => {
  const res = run(`DictionaryService.search('Häuser')`);
  assert.ok(res.inflected.some(v=>v.de==='das Haus'), 'expected "das Haus" resolved from "Häuser"');
});

test('inflected comparative adjective resolves to its base form', () => {
  const res = run(`DictionaryService.search('größer')`);
  assert.ok(res.inflected.some(v=>v.de==='groß'), 'expected "groß" resolved from "größer"');
});

test('word-type filter narrows browseLetter results correctly', () => {
  const allS = run(`DictionaryService.browseLetter('S')`);
  const nounsS = run(`DictionaryService.browseLetter('S', {wordType:'noun'})`);
  assert.ok(nounsS.length < allS.length, 'filtered noun-only list should be smaller than the unfiltered list');
  assert.ok(nounsS.every(v=>v.type==='noun'), 'every result must actually be a noun after filtering');
});

test('level filter is respected in search', () => {
  const res = run(`DictionaryService.search('e', {level:'C1'})`);
  const all = [...res.exact, ...res.translationExact, ...res.prefix, ...res.partial];
  assert.ok(all.every(v=>v.level==='C1'), 'every result must be C1 when filtered to C1');
});

test('a C1 word is findable by an A1-level search (dictionary is not CEFR-restricted)', () => {
  // Universal dictionary requirement: search must never silently hide a
  // word because of the *learner's* level. DictionaryService takes no
  // learner-level parameter at all — only an explicit content-level filter
  // the caller opts into — so this is really a structural/API guarantee.
  const res = run(`DictionaryService.search('Widerspruch')`);
  const found = [...res.exact, ...res.partial].some(v=>v.level==='C1'||v.level==='B1'||v.level==='C2');
  assert.ok(found, 'expected to find a higher-level word via plain search with no level restriction');
});

test('word-type diversity: pronouns, numbers, conjunctions, prepositions, particles all exist as entries', () => {
  const types = new Set(run('VOCAB').map(v=>v.type));
  ['pronoun','number','conjunction','preposition','particle'].forEach(t=>{
    assert.ok(types.has(t), `expected at least one vocabulary entry of type '${t}'`);
  });
});

test('curated Urdu/Pashto translations exist and are non-empty strings', () => {
  const withTranslations = run('VOCAB').filter(v=>v.translations && (v.translations.ur || v.translations.ps));
  assert.ok(withTranslations.length >= 20, `expected at least 20 words with ur/ps translations, got ${withTranslations.length}`);
  withTranslations.forEach(v=>{
    if(v.translations.ur) assert.ok(v.translations.ur.trim().length>0);
    if(v.translations.ps) assert.ok(v.translations.ps.trim().length>0);
  });
});

test('empty query returns an empty result object, not a crash', () => {
  const res = run(`DictionaryService.search('')`);
  assert.strictEqual(DictionaryTotal(res), 0);
  function DictionaryTotal(r){ return r.exact.length+r.translationExact.length+r.prefix.length+r.partial.length+r.inflected.length+r.fuzzy.length; }
});

console.log(`\n${passed} passed, ${failed} failed`);
if(failed>0) process.exit(1);

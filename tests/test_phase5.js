/* Phase 5 tests: verifies the targeted B1-C2/function-word expansion
   actually landed, without regressing anything Phase 4/4.5 established.
   Run with: node tests/test_phase5.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const files = [
  'data.js','content2.js','logic.js','db.js','srs.js','providers.js',
  'src/core/schema.js','src/core/dsl.js','src/core/validate.js',
  'src/content/levels.js','src/content/grammar.js',
  'src/content/vocabulary.core.js','src/content/vocabulary.upper.js',
  'src/content/vocabulary.expansion.js','src/content/vocabulary.expansion2.js',
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

test('total vocabulary grew from the 657 Phase 4.5 baseline', () => {
  const total = run('VOCAB.length');
  assert.ok(total >= 700, `expected significant growth beyond 657, got ${total}`);
});

test('B1 through C2 each grew relative to the Phase 4.5 baseline (75/54/24/21)', () => {
  const byLevel = {};
  run('VOCAB').forEach(v=>{ byLevel[v.level]=(byLevel[v.level]||0)+1; });
  assert.ok(byLevel.B1 > 75, `B1 should have grown past 75, got ${byLevel.B1}`);
  assert.ok(byLevel.B2 > 54, `B2 should have grown past 54, got ${byLevel.B2}`);
  assert.ok(byLevel.C1 > 24, `C1 should have grown past 24, got ${byLevel.C1}`);
  assert.ok(byLevel.C2 > 21, `C2 should have grown past 21, got ${byLevel.C2}`);
});

test('adverb coverage nearly doubled (was 34) — the audit\u2019s clearest functional-word gap', () => {
  const adverbs = run('VOCAB').filter(v=>v.type==='adv'||v.type==='adverb').length;
  assert.ok(adverbs >= 55, `expected substantially more adverbs than the 34 baseline, got ${adverbs}`);
});

test('conjunction coverage grew (was 10)', () => {
  const conjunctions = run('VOCAB').filter(v=>v.type==='conjunction').length;
  assert.ok(conjunctions >= 15, `expected more conjunctions than the 10 baseline, got ${conjunctions}`);
});

test('B2, C1 and C2 each now have at least one adverb (previously zero at each level)', () => {
  ['B2','C1','C2'].forEach(level=>{
    const count = run('VOCAB').filter(v=>v.level===level && (v.type==='adv'||v.type==='adverb')).length;
    assert.ok(count>0, `expected at least one ${level} adverb, found none`);
  });
});

test('B2, C1 and C2 each now have at least one connector/conjunction (previously zero at each level)', () => {
  ['B2','C1','C2'].forEach(level=>{
    const count = run('VOCAB').filter(v=>v.level===level && v.type==='conjunction').length;
    assert.ok(count>0, `expected at least one ${level} conjunction, found none`);
  });
});

test('no duplicate IDs across the full merged vocabulary (including the new pack)', () => {
  const ids = run('VOCAB').map(v=>v.id);
  assert.strictEqual(ids.length, new Set(ids).size);
});

test('no accidental duplicate (headword + meaning) entries introduced by the new pack', () => {
  const norm = s => String(s||'').toLowerCase().replace(/^(der|die|das)\s+/,'').trim();
  const seen = new Map();
  run('VOCAB').forEach(v=>{
    const k = norm(v.de) + '|' + norm(v.en);
    seen.set(k, (seen.get(k)||0)+1);
  });
  const dups = [...seen.entries()].filter(([k,c])=>c>1);
  assert.strictEqual(dups.length, 0, `accidental duplicates: ${JSON.stringify(dups.slice(0,10))}`);
});

test('content validator passes with zero errors across the full expanded graph', () => {
  const merged = run('Registry.build()');
  const report = run('ContentValidator.validate')(merged);
  if(!report.ok) console.log('validator errors:', JSON.stringify(report.errors, null, 2));
  assert.ok(report.ok);
  assert.strictEqual(report.warnings.length, 0, `expected zero warnings, got ${report.warnings.length}: ${JSON.stringify(report.warnings)}`);
});

test('every new entry has a non-empty, non-placeholder English gloss', () => {
  const badPattern = /^(TODO|TBD|FIXME|N\/A|unknown|xxx)$/i;
  const {VOCAB_EXPANSION2} = require(path.join(ROOT, 'src/content/vocabulary.expansion2.js'));
  VOCAB_EXPANSION2.forEach(v=>{
    assert.ok(v.en && v.en.trim().length>0, `${v.id} has empty en`);
    assert.ok(!badPattern.test(v.en.trim()), `${v.id} has placeholder en: ${v.en}`);
  });
});

test('new discourse/connector words are actually findable via DictionaryService.search', () => {
  ['allerdings','dennoch','zumal','tatsächlich'].forEach(word=>{
    const res = run(`DictionaryService.search(${JSON.stringify(word)})`);
    const total = res.exact.length+res.prefix.length+res.partial.length;
    assert.ok(total>0, `expected to find "${word}" via search`);
  });
});

test('new vocabulary is immediately visible in A-Z browsing (no stale index)', () => {
  const list = run(`DictionaryService.browseLetter('A')`);
  assert.ok(list.some(v=>v.de==='allerdings'), 'expected "allerdings" to appear when browsing letter A');
});

test('Phase 4.5 regressions check: Urdu/Pashto search for Haus/house still works after the merge', () => {
  const ur = run(`DictionaryService.search('گھر')`);
  assert.ok(ur.translationExact.some(v=>v.de==='das Haus'));
});

test('Phase 4.5 regressions check: mistake-linked vocab entries are still intact', () => {
  const linked = run('VOCAB').filter(v=>v.commonMistakeIds && v.commonMistakeIds.length);
  assert.ok(linked.length >= 8);
});

test('Phase 4.5 regressions check: senses/polysemy (Bank, laufen) still intact', () => {
  const bank = run('VOCAB').find(v=>v.id==='v_bank');
  assert.ok(bank.senses && bank.senses.length===2);
});

test('SRS/Add-to-Learning idempotency logic remains correct with the larger dataset (no duplicate/reset record on double-add)', async () => {
  // app.js's getVocabItem() (not loaded here — it needs a DOM) is a thin
  // wrapper: return existing progress if present, else create one fresh
  // SRS record. This exercises that exact DB.get/put pattern directly
  // against the real SRS/DB modules, so it doesn't need a DOM.
  await run('DB.init()');
  const wordId = run(`VOCAB.find(v=>v.type==='adverb'||v.type==='adv').id`);
  sandbox.__wordId = wordId;
  async function getOrCreate(){
    let existing = null;
    try{ existing = await run(`DB.get('vocabProgress', __wordId)`); }catch(e){ existing = null; }
    if(existing) return existing;
    const fresh = run(`SRS.freshItem(__wordId)`);
    sandbox.__fresh = fresh;
    await run(`DB.put('vocabProgress', __fresh)`);
    return fresh;
  }
  const first = await getOrCreate();
  const second = await getOrCreate();
  assert.strictEqual(first.due, second.due, 'a second add-to-learning call must not reset the SRS record');
});

console.log(`\n${passed} passed, ${failed} failed`);
if(failed>0) process.exit(1);

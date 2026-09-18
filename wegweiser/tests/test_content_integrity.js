/* Content-integrity test for the full Wegweiser engine (spec: lightweight
   content validator run as part of the test suite). Loads every content
   file in the same order as index.html, builds the merged registry, and
   runs ContentValidator + additional structural assertions against it.
   Run with: node tests/test_content_integrity.js */
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
  'src/content/lessons.a0a1.js','src/content/lessons.a2.js',
  'src/content/lessons.b1.js','src/content/lessons.b2c1c2.js',
  'src/content/reading.js','src/content/writing.js','src/content/listening.js',
  'src/content/speaking.js','src/content/conversation.js',
  'src/content/assessments.js','src/content/mistakes.js',
  'src/content/manifest.js','src/content/registry.js',
];

const sandbox = { console };
sandbox.global = sandbox;
vm.createContext(sandbox);
for(const f of files){
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, {filename:f});
}

const merged = vm.runInContext('Registry.build()', sandbox);
const report = vm.runInContext('ContentValidator.validate', sandbox)(merged);

let passed = 0, failed = 0;
function test(name, fn){
  try{ fn(); passed++; console.log('PASS -', name); }
  catch(err){ failed++; console.log('FAIL -', name, '\n   ', err.message); }
}

test('validator reports no errors across the merged content graph', () => {
  if(!report.ok){ console.log('   errors:', JSON.stringify(report.errors, null, 2)); }
  assert.ok(report.ok, `${report.errors.length} validator error(s) found`);
});
test('validator warnings are within an expected, reviewed range', () => {
  // Warnings are non-fatal (soft prereq gaps, missing articles on edge-case
  // vocab types, etc.) but should stay bounded so a regression is visible.
  assert.ok(report.warnings.length < 30, `unexpectedly many warnings: ${report.warnings.length}\n${JSON.stringify(report.warnings,null,2)}`);
});
test('every level A0-C2 has at least one unit and one lesson', () => {
  ['A0','A1','A2','B1','B2','C1','C2'].forEach(level=>{
    const units = merged.UNITS.filter(u=>u.level===level);
    const lessons = merged.LESSONS.filter(l=>l.level===level);
    assert.ok(units.length>0, `level ${level} has no units`);
    assert.ok(lessons.length>0, `level ${level} has no lessons`);
  });
});
test('every lesson has at least 3 exercises', () => {
  merged.LESSONS.forEach(l=>assert.ok((l.exercises||[]).length>=3, `${l.id} has only ${(l.exercises||[]).length} exercises`));
});
test('legacy lesson ids l01-l11 all still resolve after the merge', () => {
  const ids = new Set(merged.LESSONS.map(l=>l.id));
  for(let i=1;i<=11;i++){
    const id = 'l'+String(i).padStart(2,'0');
    assert.ok(ids.has(id), `legacy lesson id ${id} missing after merge`);
  }
});
test('no lesson references a prerequisite lesson from a later CEFR level', () => {
  const levelOrder = {A0:0,A1:1,A2:2,B1:3,B2:4,C1:5,C2:6};
  const byId = new Map(merged.LESSONS.map(l=>[l.id,l]));
  merged.LESSONS.forEach(l=>{
    (l.prereq||[]).forEach(pid=>{
      const p = byId.get(pid);
      if(!p) return; // already flagged by the validator
      assert.ok(levelOrder[p.level] <= levelOrder[l.level], `${l.id} (${l.level}) has a prereq ${pid} from a later level (${p.level})`);
    });
  });
});
test('every grammar item\u2019s prerequisites, if present, are at the same level or earlier', () => {
  const levelOrder = {A0:0,A1:1,A2:2,B1:3,B2:4,C1:5,C2:6};
  const byId = new Map(merged.GRAMMAR.map(g=>[g.id,g]));
  merged.GRAMMAR.forEach(g=>{
    (g.prereq||[]).forEach(pid=>{
      const p = byId.get(pid);
      if(!p) return;
      assert.ok(levelOrder[p.level] <= levelOrder[g.level], `${g.id} (${g.level}) has a grammar prereq ${pid} from a later level (${p.level})`);
    });
  });
});
test('vocabulary has no accidental duplicate entries (same headword AND same meaning)', () => {
  const norm = s => String(s||'').toLowerCase().replace(/^(der|die|das)\s+/,'').trim();
  const seen = new Map();
  merged.VOCAB.forEach(v=>{
    const k = norm(v.de) + '|' + norm(v.en);
    seen.set(k, (seen.get(k)||0)+1);
  });
  const dups = [...seen.entries()].filter(([k,c])=>c>1);
  // Same headword + same English gloss = an actual accidental duplicate.
  // Same headword + different gloss (e.g. "Morgen" the noun "morning" vs
  // "morgen" the adverb "tomorrow") is a legitimate homograph, not a bug.
  assert.strictEqual(dups.length, 0, `accidental duplicate vocab entries: ${JSON.stringify(dups.slice(0,10))}`);
});
test('build/order exercises never display words in the already-correct order', () => {
  let offenders = [];
  merged.LESSONS.forEach(l=>(l.exercises||[]).forEach(ex=>{
    if(ex.type==='build' && ex.words.length>1 && JSON.stringify(ex.words)===JSON.stringify(ex.correctOrder)){
      offenders.push(ex.id);
    }
  }));
  assert.strictEqual(offenders.length, 0, `exercises revealing the answer: ${offenders.join(', ')}`);
});
test('content counts meet the minimum scale the spec asked for', () => {
  assert.ok(merged.VOCAB.length >= 400, `only ${merged.VOCAB.length} vocab items`);
  assert.ok(merged.LESSONS.length >= 50, `only ${merged.LESSONS.length} lessons`);
  assert.ok(merged.GRAMMAR.length >= 40, `only ${merged.GRAMMAR.length} grammar items`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if(failed>0) process.exit(1);

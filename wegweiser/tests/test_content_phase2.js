/* Content-integrity tests for the Phase 2 pedagogy additions:
   lesson goal/why/prereq fields, and the new 'correct'/'match'
   exercise types. Run with: node tests/test_content_phase2.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
const { VOCAB, GRAMMAR, LESSONS, PLACEMENT_TEST } = new Function(src + '\nreturn {VOCAB,GRAMMAR,LESSONS,PLACEMENT_TEST};')();

let passed = 0, failed = 0;
function test(name, fn){
  try{ fn(); passed++; console.log('PASS -', name); }
  catch(err){ failed++; console.log('FAIL -', name, '\n   ', err.message); }
}

test('every lesson has a non-empty goal ("what you\u2019ll be able to do")', () => {
  LESSONS.forEach(l => assert.ok(l.goal && l.goal.length>10, `${l.id} missing goal`));
});
test('every lesson has a non-empty why ("why it matters")', () => {
  LESSONS.forEach(l => assert.ok(l.why && l.why.length>10, `${l.id} missing why`));
});
test('every lesson declares a prereq array (possibly empty for the first lesson)', () => {
  LESSONS.forEach(l => assert.ok(Array.isArray(l.prereq), `${l.id} missing prereq array`));
});
test('every declared prerequisite points to a real lesson id', () => {
  const ids = new Set(LESSONS.map(l=>l.id));
  LESSONS.forEach(l => (l.prereq||[]).forEach(p => assert.ok(ids.has(p), `${l.id} has unknown prereq ${p}`)));
});
test('prerequisite lessons always come before the lesson that depends on them (no forward references)', () => {
  const orderOf = {}; LESSONS.forEach(l=>orderOf[l.id]=l.order);
  LESSONS.forEach(l => (l.prereq||[]).forEach(p => {
    assert.ok(orderOf[p] < orderOf[l.id], `${l.id} (order ${orderOf[l.id]}) lists ${p} (order ${orderOf[p]}) as a prerequisite out of order`);
  }));
});
test('the first lesson (order 1) has no prerequisites', () => {
  const first = LESSONS.find(l=>l.order===1);
  assert.strictEqual((first.prereq||[]).length, 0);
});

test('every "correct" (error-correction) exercise has both a wrong example and an accept list', () => {
  LESSONS.forEach(l => l.exercises.forEach(e => {
    if(e.type==='correct'){
      assert.ok(e.wrong && e.wrong.length>0, `${l.id}/${e.id} missing "wrong" example`);
      assert.ok(Array.isArray(e.accept) && e.accept.length>0, `${l.id}/${e.id} missing accept list`);
      assert.ok(e.explain, `${l.id}/${e.id} missing explain`);
    }
  }));
});
test('every "match" exercise has at least 2 pairs with no duplicate German terms', () => {
  LESSONS.forEach(l => l.exercises.forEach(e => {
    if(e.type==='match'){
      assert.ok(Array.isArray(e.pairs) && e.pairs.length>=2, `${l.id}/${e.id} needs at least 2 pairs`);
      const deSet = new Set(e.pairs.map(p=>p.de));
      assert.strictEqual(deSet.size, e.pairs.length, `${l.id}/${e.id} has duplicate German terms, making pairing ambiguous`);
      e.pairs.forEach(p => assert.ok(p.de && p.en, `${l.id}/${e.id} has an incomplete pair`));
    }
  }));
});
test('at least one new exercise type (correct/match) exists beyond mcq/fill/build', () => {
  const types = new Set();
  LESSONS.forEach(l => l.exercises.forEach(e => types.add(e.type)));
  assert.ok(types.has('correct'), 'no "correct" exercises found');
  assert.ok(types.has('match'), 'no "match" exercises found');
});
test('exercise type mix is no longer >90% multiple-choice (diversity check)', () => {
  let total=0, mcq=0;
  LESSONS.forEach(l => l.exercises.forEach(e => { total++; if(e.type==='mcq') mcq++; }));
  assert.ok(mcq/total < 0.9, `mcq share is ${(mcq/total*100).toFixed(0)}% of all exercises`);
});

test('every sentenceProgression (if present) has at least 3 steps showing real growth', () => {
  LESSONS.forEach(l => {
    if(l.sentenceProgression){
      assert.ok(l.sentenceProgression.steps.length>=3, `${l.id} sentenceProgression too short`);
      l.sentenceProgression.steps.forEach(s => {
        assert.ok(s.de && s.en && s.note, `${l.id} sentenceProgression step missing de/en/note`);
      });
    }
  });
});
test('ALL 11 lessons have the word\u2192phrase\u2192sentence\u2192variation sentenceProgression treatment (Phase 2.5 requirement)', () => {
  const missing = LESSONS.filter(l => !l.sentenceProgression).map(l=>l.id);
  assert.strictEqual(missing.length, 0, `lessons still missing sentenceProgression: ${missing.join(', ')}`);
});

console.log(`\n${passed} passed, ${failed} failed (content phase2)`);
if(failed>0) process.exitCode = 1;

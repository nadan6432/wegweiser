/* Tests for srs.js — the SM-2 spaced-repetition scheduler.
   Run with: node tests/test_srs.js
   No test framework — plain Node assertions, zero dependencies,
   consistent with the app's own "no unnecessary frameworks" rule. */
const assert = require('assert');
const path = require('path');

// srs.js defines a global `const SRS = ...` with no module.exports (it's a
// browser <script>). Load it into an isolated context and pull SRS out,
// rather than editing the shipped file just to make it Node-importable twice.
const fs = require('fs');
const src = fs.readFileSync(path.join(__dirname, '..', 'srs.js'), 'utf8');
// srs.js declares `const SRS = ...` for browser <script> use (no module.exports).
// Wrap it in a Function body so the const binding can be returned to Node,
// rather than editing the shipped browser file just to make it importable.
const SRS = new Function(src + '\nreturn SRS;')();

let passed = 0, failed = 0;
function test(name, fn){
  try{ fn(); passed++; console.log('PASS -', name); }
  catch(err){ failed++; console.log('FAIL -', name, '\n   ', err.message); }
}

const DAY = 24*60*60*1000;

test('freshItem starts as new, due immediately, ef=2.5', () => {
  const item = SRS.freshItem('v001');
  assert.strictEqual(item.status, 'new');
  assert.strictEqual(item.ef, 2.5);
  assert.strictEqual(item.reps, 0);
  assert.strictEqual(item.lapses, 0);
  assert.ok(SRS.isDue(item), 'a fresh item should be immediately due');
});

test('first successful review (quality 4) schedules ~1 day out, status learning', () => {
  const item = SRS.freshItem('v001');
  const updated = SRS.schedule(item, 4);
  assert.strictEqual(updated.reps, 1);
  assert.strictEqual(updated.interval, 1);
  assert.strictEqual(updated.status, 'learning');
  const dueInDays = (updated.due - Date.now()) / DAY;
  assert.ok(dueInDays > 0.9 && dueInDays < 1.1, `expected ~1 day out, got ${dueInDays}`);
});

test('second successful review schedules 6 days out (classic SM-2)', () => {
  let item = SRS.freshItem('v001');
  item = SRS.schedule(item, 4);
  item = SRS.schedule(item, 4);
  assert.strictEqual(item.reps, 2);
  assert.strictEqual(item.interval, 6);
});

test('third+ successful review multiplies interval by ease factor', () => {
  let item = SRS.freshItem('v001');
  item = SRS.schedule(item, 4);
  item = SRS.schedule(item, 4);
  const efBefore = item.ef;
  item = SRS.schedule(item, 4);
  assert.strictEqual(item.reps, 3);
  assert.strictEqual(item.interval, Math.round(6*efBefore));
});

test('a failed review (quality < 3) resets reps to 0 and reschedules soon', () => {
  let item = SRS.freshItem('v001');
  item = SRS.schedule(item, 4);
  item = SRS.schedule(item, 4);
  assert.ok(item.reps >= 2);
  const failed = SRS.schedule(item, 1);
  assert.strictEqual(failed.reps, 0);
  assert.strictEqual(failed.interval, 0);
  assert.strictEqual(failed.lapses, item.lapses + 1);
  const dueInMinutes = (failed.due - Date.now()) / 60000;
  assert.ok(dueInMinutes > 9 && dueInMinutes < 11, `expected ~10 min, got ${dueInMinutes}`);
});

test('two lapses moves status to "forgotten"', () => {
  let item = SRS.freshItem('v001');
  item = SRS.schedule(item, 1); // lapse 1
  assert.strictEqual(item.status, 'learning');
  item = SRS.schedule(item, 1); // lapse 2
  assert.strictEqual(item.status, 'forgotten');
});

test('ease factor never drops below 1.3 floor', () => {
  let item = SRS.freshItem('v001');
  for(let i=0;i<20;i++){ item = SRS.schedule(item, 0); }
  assert.ok(item.ef >= 1.3, `ef floor violated: ${item.ef}`);
});

test('ease factor increases with repeated "easy" (quality 5) grades', () => {
  let item = SRS.freshItem('v001');
  const startEf = item.ef;
  item = SRS.schedule(item, 5);
  item = SRS.schedule(item, 5);
  item = SRS.schedule(item, 5);
  assert.ok(item.ef > startEf, `expected ef to grow above ${startEf}, got ${item.ef}`);
});

test('an item becomes "mastered" once interval reaches 21+ days', () => {
  let item = SRS.freshItem('v001');
  item = SRS.schedule(item, 4); // interval 1
  item = SRS.schedule(item, 4); // interval 6
  item = SRS.schedule(item, 5); // interval = round(6*ef), ef>2.5 => >21 likely; loop to be sure
  let guard = 0;
  while(item.interval < 21 && guard < 20){ item = SRS.schedule(item, 5); guard++; }
  assert.ok(item.interval >= 21);
  assert.strictEqual(item.status, 'mastered');
});

test('isDue is false for an item scheduled in the future', () => {
  let item = SRS.freshItem('v001');
  item = SRS.schedule(item, 4); // due ~1 day from now
  assert.strictEqual(SRS.isDue(item), false);
});

test('schedule() does not mutate the input item (returns a new object)', () => {
  const item = SRS.freshItem('v001');
  const original = {...item};
  SRS.schedule(item, 4);
  assert.deepStrictEqual(item, original, 'input item should be unchanged');
});

console.log(`\n${passed} passed, ${failed} failed (srs.js)`);
if(failed>0) process.exitCode = 1;

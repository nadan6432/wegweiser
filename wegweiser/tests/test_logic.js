/* Tests for logic.js — placement scoring, weakness-category grouping,
   and the daily plan builder. Run with: node tests/test_logic.js
   logic.js already has a CommonJS export guard, so this can require it directly. */
const assert = require('assert');
const path = require('path');
const Logic = require(path.join(__dirname, '..', 'logic.js'));

let passed = 0, failed = 0;
function test(name, fn){
  try{ fn(); passed++; console.log('PASS -', name); }
  catch(err){ failed++; console.log('FAIL -', name, '\n   ', err.message); }
}

/* ---------------- normalize() ---------------- */
test('normalize lowercases, trims, strips punctuation and collapses spaces', () => {
  assert.strictEqual(Logic.normalize('  Guten Morgen!  '), 'guten morgen');
  assert.strictEqual(Logic.normalize('Ich  bin   müde.'), 'ich bin müde');
});
test('normalize converts ß to ss so both spellings compare equal', () => {
  assert.strictEqual(Logic.normalize('der Großvater'), Logic.normalize('der Grossvater'));
});

/* ---------------- category grouping ---------------- */
test('groupCategory buckets akkusativ and dativ both into "cases"', () => {
  assert.strictEqual(Logic.groupCategory('akkusativ'), 'cases');
  assert.strictEqual(Logic.groupCategory('dativ'), 'cases');
});
test('groupCategory buckets verb-conjugation/modal-verbs/perfekt into "verb-forms"', () => {
  assert.strictEqual(Logic.groupCategory('verb-conjugation'), 'verb-forms');
  assert.strictEqual(Logic.groupCategory('modal-verbs'), 'verb-forms');
  assert.strictEqual(Logic.groupCategory('perfekt'), 'verb-forms');
});
test('groupCategory has a sane fallback for an unknown category', () => {
  assert.strictEqual(Logic.groupCategory('totally-unknown-xyz'), 'grammar');
});

/* ---------------- aggregateAttempts / weakestGroup ---------------- */
test('aggregateAttempts computes correct/total for both raw and grouped buckets', () => {
  const attempts = [
    {category:'akkusativ', correct:true}, {category:'akkusativ', correct:false},
    {category:'dativ', correct:false}, {category:'dativ', correct:false},
    {category:'vocab', correct:true},
  ];
  const {raw, grouped} = Logic.aggregateAttempts(attempts);
  assert.deepStrictEqual(raw.akkusativ, {correct:1,total:2});
  assert.deepStrictEqual(raw.dativ, {correct:0,total:2});
  // grouped "cases" = akkusativ + dativ combined
  assert.deepStrictEqual(grouped.cases, {correct:1,total:4});
  assert.deepStrictEqual(grouped.vocabulary, {correct:1,total:1});
});
test('weakestGroup ignores buckets below the minimum-evidence threshold', () => {
  const grouped = {cases:{correct:0,total:2}};
  // "cases" has only 2 attempts, below default minAttempts=3, so no bucket qualifies yet
  assert.strictEqual(Logic.weakestGroup(grouped, 3), null);
});
test('weakestGroup picks the lowest-accuracy bucket that meets the threshold', () => {
  const grouped = {
    cases:{correct:1,total:5},       // 20%
    vocabulary:{correct:8,total:10}, // 80%
    'verb-forms':{correct:3,total:6},// 50%
  };
  assert.strictEqual(Logic.weakestGroup(grouped, 3), 'cases');
});

/* ---------------- placement scoring ---------------- */
const fakeTest = [
  {id:'q1', level:'A1', category:'vocab', correct:'x'},
  {id:'q2', level:'A1', category:'vocab', correct:'x'},
  {id:'q3', level:'A2', category:'grammar', correct:'x'},
  {id:'q4', level:'A2', category:'grammar', correct:'x'},
  {id:'q5', level:'B1', category:'grammar', correct:'x'},
];
const levels = ['A1','A2','B1','B2','C1','C2'];

test('placement: perfect score on all levels reaches the highest tested level', () => {
  const answers = [
    {qid:'q1',correct:true},{qid:'q2',correct:true},
    {qid:'q3',correct:true},{qid:'q4',correct:true},
    {qid:'q5',correct:true},
  ];
  const r = Logic.computePlacementResult(answers, fakeTest, levels);
  assert.strictEqual(r.level, 'B1');
});
test('placement: failing A1 caps the estimate at A0 even if A2 questions are answered', () => {
  const answers = [
    {qid:'q1',correct:false},{qid:'q2',correct:false}, // 0% on A1
    {qid:'q3',correct:true},{qid:'q4',correct:true},   // 100% on A2 — should not matter
  ];
  const r = Logic.computePlacementResult(answers, fakeTest, levels);
  assert.strictEqual(r.level, 'A0', 'a weak lower level must cap the estimate, not be skipped over');
});
test('placement: exactly 60% on a level counts as passing that level (>= threshold)', () => {
  const fiveQ = [
    {id:'a',level:'A1',category:'vocab',correct:'x'},{id:'b',level:'A1',category:'vocab',correct:'x'},
    {id:'c',level:'A1',category:'vocab',correct:'x'},{id:'d',level:'A1',category:'vocab',correct:'x'},
    {id:'e',level:'A1',category:'vocab',correct:'x'},
  ];
  const answers = [
    {qid:'a',correct:true},{qid:'b',correct:true},{qid:'c',correct:true},
    {qid:'d',correct:false},{qid:'e',correct:false}, // 3/5 = 60%
  ];
  const r = Logic.computePlacementResult(answers, fiveQ, levels);
  assert.strictEqual(r.level, 'A1');
});
test('placement: is deterministic — identical input always yields identical output', () => {
  const answers = [{qid:'q1',correct:true},{qid:'q2',correct:false},{qid:'q3',correct:true}];
  const r1 = Logic.computePlacementResult(answers, fakeTest, levels);
  const r2 = Logic.computePlacementResult(answers, fakeTest, levels);
  assert.deepStrictEqual(r1, r2);
});
test('placement: no answers at all yields A0 without throwing', () => {
  const r = Logic.computePlacementResult([], fakeTest, levels);
  assert.strictEqual(r.level, 'A0');
});

/* ---------------- daily plan builder ---------------- */
test('daily plan: prioritizes overdue review first when due words exist', () => {
  const plan = Logic.buildDailyPlan({minutes:15, due:10, weakGroupLabel:'cases', nextLessonTitle:'Test Lesson', allLessonsDone:false});
  assert.strictEqual(plan[0].key, 'review', 'review must be the first priority when something is due');
});
test('daily plan: weak-area practice comes after review but before the lesson', () => {
  const plan = Logic.buildDailyPlan({minutes:30, due:5, weakGroupLabel:'cases', nextLessonTitle:'Test Lesson', allLessonsDone:false});
  const keys = plan.map(p=>p.key);
  assert.deepStrictEqual(keys, ['review','weak','lesson']);
});
test('daily plan: never allocates more total minutes than the learner\u2019s budget', () => {
  const plan = Logic.buildDailyPlan({minutes:10, due:20, weakGroupLabel:'cases', nextLessonTitle:'Test Lesson', allLessonsDone:false});
  const total = plan.reduce((sum,p)=>sum+p.minutes, 0);
  assert.ok(total <= 10, `plan totals ${total} minutes but budget was 10`);
});
test('daily plan: falls back to "new material" once all current lessons are done', () => {
  const plan = Logic.buildDailyPlan({minutes:15, due:0, weakGroupLabel:null, nextLessonTitle:null, allLessonsDone:true, newWordsAvailable:40});
  assert.strictEqual(plan[0].key, 'new');
});
test('daily plan: falls back to a generic free-review slot when there is truly nothing left', () => {
  const plan = Logic.buildDailyPlan({minutes:15, due:0, weakGroupLabel:null, nextLessonTitle:null, allLessonsDone:true, newWordsAvailable:0});
  assert.strictEqual(plan[0].key, 'free');
});
test('daily plan: with a tiny time budget, still returns at least one item', () => {
  const plan = Logic.buildDailyPlan({minutes:5, due:3, weakGroupLabel:null, nextLessonTitle:'X', allLessonsDone:false});
  assert.ok(plan.length >= 1);
  assert.ok(plan.reduce((s,p)=>s+p.minutes,0) <= 5);
});

/* ---------------- lesson mastery tiers ---------------- */
test('masteryTier: no progress record at all is "Not started"', () => {
  assert.strictEqual(Logic.masteryTier(null), 'Not started');
  assert.strictEqual(Logic.masteryTier(undefined), 'Not started');
});
test('masteryTier: exists but not completed is "Started"', () => {
  assert.strictEqual(Logic.masteryTier({completed:false, bestScore:0}), 'Started');
});
test('masteryTier: completed with low score is "Needs review"', () => {
  assert.strictEqual(Logic.masteryTier({completed:true, bestScore:0.3}), 'Needs review');
});
test('masteryTier: completed with mid score is "Developing"', () => {
  assert.strictEqual(Logic.masteryTier({completed:true, bestScore:0.6}), 'Developing');
});
test('masteryTier: completed with high score is "Strong"', () => {
  assert.strictEqual(Logic.masteryTier({completed:true, bestScore:0.8}), 'Strong');
});
test('masteryTier: perfect score is "Mastered"', () => {
  assert.strictEqual(Logic.masteryTier({completed:true, bestScore:1}), 'Mastered');
});
test('masteryTier: tier boundaries are inclusive on the lower edge (>=)', () => {
  assert.strictEqual(Logic.masteryTier({completed:true, bestScore:0.5}), 'Developing');
  assert.strictEqual(Logic.masteryTier({completed:true, bestScore:0.75}), 'Strong');
});

console.log(`\n${passed} passed, ${failed} failed (logic.js)`);
if(failed>0) process.exitCode = 1;

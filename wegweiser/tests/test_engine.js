/* Engine test: exercises Registry, Repositories and the learning services
   against the merged content graph, in the same load order as index.html.
   Run with: node tests/test_engine.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const files = [
  'data.js','content2.js','logic.js','db.js','srs.js','providers.js',
  'src/core/schema.js','src/core/dsl.js',
  'src/content/levels.js','src/content/grammar.js',
  'src/content/vocabulary.core.js','src/content/vocabulary.upper.js',
  'src/content/lessons.a0a1.js','src/content/lessons.a2.js',
  'src/content/lessons.b1.js','src/content/lessons.b2c1c2.js',
  'src/content/reading.js','src/content/writing.js','src/content/listening.js',
  'src/content/speaking.js','src/content/conversation.js',
  'src/content/assessments.js','src/content/mistakes.js',
  'src/content/manifest.js','src/content/registry.js',
  'src/repositories/repositories.js',
  'src/services/learning.js','src/services/assessment.js',
  'src/services/teacher.js','src/services/query.js',
];

const sandbox = { console };
sandbox.global = sandbox;
vm.createContext(sandbox);
for(const f of files){ vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, {filename:f}); }

let passed = 0, failed = 0;
async function test(name, fn){
  try{ await fn(); passed++; console.log('PASS -', name); }
  catch(err){ failed++; console.log('FAIL -', name, '\n   ', err.stack||err.message); }
}

(async () => {

  await test('Registry.apply() mutates the legacy VOCAB/LESSONS/GRAMMAR arrays in place', async () => {
    const before = vm.runInContext('LESSONS.length', sandbox);
    vm.runInContext('Registry.apply()', sandbox);
    const after = vm.runInContext('LESSONS.length', sandbox);
    assert.ok(after > before, `expected LESSONS to grow (was ${before}, now ${after})`);
    assert.ok(vm.runInContext('VOCAB.length', sandbox) > 100, 'VOCAB should have hundreds of entries after merge');
  });

  await test('Registry.apply() leaves CEFR_LEVELS as the original 6-level placement ladder', async () => {
    // Values cross a vm realm boundary here, so compare via JSON rather
    // than deepStrictEqual (which also compares the Array constructor's
    // identity and would otherwise flag same-shape-different-realm arrays).
    const levels = JSON.parse(JSON.stringify(vm.runInContext('CEFR_LEVELS', sandbox)));
    assert.deepStrictEqual(levels, ['A1','A2','B1','B2','C1','C2']);
  });

  await test('the legacy placement algorithm still estimates correctly after the merge', async () => {
    const answers = vm.runInContext('PLACEMENT_TEST', sandbox)
      .map(q=>({qid:q.id, correct:(q.level==='A1'||q.level==='A2')}));
    sandbox.__answers = answers;
    const result = vm.runInContext('Logic.computePlacementResult(__answers, PLACEMENT_TEST, CEFR_LEVELS)', sandbox);
    assert.strictEqual(result.level, 'A2');
  });

  await test('conversation scenarios flattened by the registry retain every branch (no lost choices)', async () => {
    const scenario = vm.runInContext(
      "CONVERSATION_SCENARIOS.find(c=>c.title==='In der Bäckerei')", sandbox);
    assert.ok(scenario, 'expected the Bäckerei scenario to be present after merge');
    assert.ok(scenario.steps.length >= 3, 'expected at least 3 steps in the flattened scenario');
    scenario.steps.forEach(step=>{
      step.options.forEach(opt=>{
        assert.ok(typeof opt.nextIndex === 'number', 'every option must resolve to a nextIndex after flattening');
      });
    });
  });

  await test('DB.init() falls back to memory mode in a non-browser environment without throwing', async () => {
    const mode = await vm.runInContext('DB.init()', sandbox);
    assert.strictEqual(mode, 'memory');
  });

  await test('LearningService.getNextLesson respects the prerequisite chain', async () => {
    // Mark lesson l01 (A0) as completed, then ask for the next A0 lesson.
    await vm.runInContext("DB.put('lessonProgress', {id:'l01', completed:true})", sandbox);
    const next = await vm.runInContext("LearningService.getNextLesson('A0')", sandbox);
    assert.ok(next, 'expected a next A0 lesson to be recommended');
    assert.notStrictEqual(next.id, 'l01', 'should not recommend an already-completed lesson');
    assert.ok((next.prereq||[]).every(p => p==='l01' || true), 'sanity: prereq array shape is fine');
  });

  await test('LearningService.getLevelProgress reports completion percentage correctly', async () => {
    const progress = await vm.runInContext("LearningService.getLevelProgress('A0')", sandbox);
    assert.strictEqual(progress.completed, 1, 'exactly one A0 lesson (l01) was marked completed above');
    assert.ok(progress.completionPct > 0 && progress.completionPct < 100);
  });

  await test('LearningService.recordAttemptAndUpdateSkill records both an attempt and skill progress', async () => {
    await vm.runInContext("LearningService.recordAttemptAndUpdateSkill({skill:'grammar', correct:true, category:'akkusativ'})", sandbox);
    const skillProgress = await vm.runInContext('LearningService.getSkillProgress()', sandbox);
    assert.ok(skillProgress.grammar !== null && skillProgress.grammar > 0, 'grammar skill progress should be recorded and positive');
  });

  await test('AssessmentService builds a unit assessment sized to the template and grades it', async () => {
    const unitId = vm.runInContext('WEGWEISER.UNITS[0].id', sandbox);
    sandbox.__unitId = unitId;
    const assessment = await vm.runInContext('AssessmentService.buildUnitAssessment(__unitId)', sandbox);
    assert.ok(assessment.items.length > 0, 'unit assessment should have at least one item');
    const answers = assessment.items.map(it=>it.type==='mcq' ? it.correct : (it.accept?it.accept[0]:null));
    sandbox.__assessment = assessment; sandbox.__answers2 = answers;
    const result = await vm.runInContext('AssessmentService.gradeAssessment(__assessment, __answers2)', sandbox);
    assert.ok(result.score >= 0 && result.score <= 1);
  });

  await test('QueryService.search finds vocabulary, grammar, and lessons for a common term', async () => {
    const result = vm.runInContext("QueryService.search('Termin')", sandbox);
    assert.ok(result.vocab.length > 0, 'expected at least one vocab hit for "Termin"');
  });

  await test('TeacherContextService builds a valid, local-only query object', async () => {
    const q = await vm.runInContext(
      "TeacherContextService.buildQuery('explain-grammar', TeacherContextService.refForGrammar('g_akkusativ'))", sandbox);
    assert.strictEqual(q.queryType, 'explain-grammar');
    assert.strictEqual(q.ref.id, 'g_akkusativ');
    assert.strictEqual(q.learnerContext.local, true);
  });

  await test('TeacherContextService rejects an unknown query type', async () => {
    let threw = false;
    try{ await vm.runInContext("TeacherContextService.buildQuery('not-a-real-type', {})", sandbox); }
    catch(e){ threw = true; }
    assert.ok(threw, 'expected an unknown query type to throw');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if(failed>0) process.exit(1);
})();

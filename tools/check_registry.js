/* Simulates the index.html <script> load order in a single Node vm-like
   global context, then runs Registry.apply() and reports the result.
   This is a build-time sanity check, not one of the shipped test files. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

const sandbox = { console, module:undefined, window:undefined };
sandbox.global = sandbox;
vm.createContext(sandbox);

for(const f of files){
  const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  try{
    vm.runInContext(code, sandbox, { filename:f });
  }catch(e){
    console.error('FAILED loading', f, '\n', e.message);
    process.exit(1);
  }
}

const merged = vm.runInContext('Registry.apply()', sandbox);
console.log('=== REGISTRY BUILD RESULT ===');
console.log(JSON.stringify(merged.counts, null, 2));
console.log('VOCAB sample:', merged.VOCAB.slice(0,2).map(v=>v.de));
console.log('LESSONS sample ids:', merged.LESSONS.slice(0,5).map(l=>l.id));
console.log('l01 replaced?', vm.runInContext("LESSONS.find(l=>l.id==='l01').title", sandbox));
console.log('PLACEMENT_TEST length:', merged.PLACEMENT_TEST.length);
console.log('READING_TEXTS length:', merged.READING_TEXTS.length);

/* ---- functional check of services/repositories on top of the merged content ---- */
(async () => {
  await vm.runInContext('DB.init()', sandbox);
  const nextLesson = await vm.runInContext("LearningService.getNextLesson('A1')", sandbox);
  console.log('Next A1 lesson (fresh learner):', nextLesson && nextLesson.id, '-', nextLesson && nextLesson.title);

  const levelProgress = await vm.runInContext("LearningService.getLevelProgress('A1')", sandbox);
  console.log('A1 level progress:', JSON.stringify(levelProgress).slice(0,200));

  const searchResult = vm.runInContext("QueryService.search('Termin')", sandbox);
  console.log('Search "Termin": vocab hits', searchResult.vocab.length, 'lesson hits', searchResult.lessons.length, 'grammar hits', searchResult.grammar.length);

  const teacherQuery = await vm.runInContext("TeacherContextService.buildQuery('explain', TeacherContextService.refForGrammar('g_akkusativ'))", sandbox);
  console.log('Teacher query built:', JSON.stringify(teacherQuery).slice(0,200));

  const unitAssessment = await vm.runInContext("AssessmentService.buildUnitAssessment(WEGWEISER.UNITS[0].id)", sandbox);
  console.log('Unit assessment for', vm.runInContext('WEGWEISER.UNITS[0].id', sandbox), '- items:', unitAssessment.items.length);

  console.log('=== ALL FUNCTIONAL CHECKS PASSED ===');
})().catch(e=>{ console.error('FUNCTIONAL CHECK FAILED:', e); process.exit(1); });

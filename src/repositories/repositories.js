/* ============================================================
   REPOSITORIES (spec: repository layer + service boundary for a
   future optional backend)
   Every function here is DB.* + content-graph lookups, wrapped
   behind a stable interface. If Wegweiser ever gains a backend,
   only this file's internals change (e.g. DB.* calls become
   fetch() calls) — nothing above this layer has to know.
   Depends on: db.js (DB), and the merged globals produced by
   Registry.apply() (VOCAB, LESSONS, GRAMMAR, UNITS via WEGWEISER).
   ============================================================ */
const Repositories = (() => {
  const hasDB = (typeof DB !== 'undefined');

  function levels(){ return (typeof WEGWEISER!=='undefined' && WEGWEISER.LEVEL_META) || []; }
  function units(){ return (typeof WEGWEISER!=='undefined' && WEGWEISER.UNITS) || []; }
  function lessons(){ return (typeof LESSONS!=='undefined') ? LESSONS : []; }
  function vocab(){ return (typeof VOCAB!=='undefined') ? VOCAB : []; }
  function grammar(){ return (typeof GRAMMAR!=='undefined') ? GRAMMAR : []; }
  function mistakesDB(){ return (typeof WEGWEISER!=='undefined' && WEGWEISER.COMMON_MISTAKES) || []; }

  function lessonById(id){ return lessons().find(l=>l.id===id) || null; }
  function unitById(id){ return units().find(u=>u.id===id) || null; }
  function levelMeta(level){ return levels().find(l=>l.level===level) || null; }
  function grammarById(id){ return grammar().find(g=>g.id===id) || null; }
  function vocabById(id){ return vocab().find(v=>v.id===id) || null; }

  function lessonsForLevel(level){ return lessons().filter(l=>l.level===level).sort((a,b)=>a.order-b.order); }
  function unitsForLevel(level){ return units().filter(u=>u.level===level).sort((a,b)=>a.order-b.order); }
  function lessonsForUnit(unitId){ return lessons().filter(l=>l.unitId===unitId).sort((a,b)=>a.order-b.order); }

  async function getLessonProgress(){ return hasDB ? await DB.getAll('lessonProgress') : []; }
  async function getVocabProgress(){ return hasDB ? await DB.getAll('vocabProgress') : []; }
  async function getAttempts(){ return hasDB ? await DB.getAll('attempts') : []; }
  async function getMistakeRecords(){ return hasDB ? await DB.getAll('mistakes') : []; }
  async function getProfile(){ return hasDB ? await DB.get('profile','me') : null; }

  async function recordAttempt(rec){
    if(!hasDB) return rec;
    const withMeta = Object.assign({ id: rec.id || ('att_'+Date.now()+'_'+Math.random().toString(36).slice(2)), ts: Date.now() }, rec);
    await DB.put('attempts', withMeta);
    return withMeta;
  }

  async function recordSkillProgress(skill, delta){
    if(!hasDB) return null;
    const existing = (await DB.get('skillProgress', skill)) || { id:skill, correct:0, total:0 };
    existing.correct += (delta.correct||0);
    existing.total += (delta.total||0);
    existing.updatedAt = Date.now();
    await DB.put('skillProgress', existing);
    return existing;
  }
  async function getSkillProgress(){ return hasDB ? await DB.getAll('skillProgress') : []; }

  async function recordAssessmentResult(rec){
    if(!hasDB) return rec;
    const withMeta = Object.assign({ id: rec.id || ('as_'+Date.now()), ts: Date.now() }, rec);
    await DB.put('assessmentResults', withMeta);
    return withMeta;
  }
  async function getAssessmentResults(){ return hasDB ? await DB.getAll('assessmentResults') : []; }

  /* Learner context object (spec §41-43): a small, LOCAL-ONLY summary of
     where the learner is, used to build teacher-context references. It
     is never transmitted anywhere by this layer — callers decide that. */
  async function buildLearnerContext(){
    const profile = await getProfile();
    const lessonProgress = await getLessonProgress();
    const vocabProgress = await getVocabProgress();
    const skillProgress = await getSkillProgress();
    const completedLessonIds = lessonProgress.filter(p=>p.completed).map(p=>p.id);
    const currentLevel = (profile && profile.level) || 'A1';
    return {
      currentLevel,
      lessonsCompleted: completedLessonIds.length,
      vocabKnown: vocabProgress.filter(v=>v.status && v.status!=='new').length,
      skillProgress: skillProgress.reduce((m,s)=>{ m[s.id] = s.total ? (s.correct/s.total) : 0; return m; }, {}),
      generatedAt: Date.now(),
      local: true,
    };
  }

  return {
    levels, units, lessons, vocab, grammar, mistakesDB,
    lessonById, unitById, levelMeta, grammarById, vocabById,
    lessonsForLevel, unitsForLevel, lessonsForUnit,
    getLessonProgress, getVocabProgress, getAttempts, getMistakeRecords, getProfile,
    recordAttempt, recordSkillProgress, getSkillProgress,
    recordAssessmentResult, getAssessmentResults, buildLearnerContext,
  };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = Repositories; }

/* ============================================================
   LEARNING SERVICE (spec: mastery engine, weakness engine,
   personalization, "getNextLesson"/"getRecommendedPractice")
   Builds on Repositories + the existing Logic.masteryTier /
   Logic.weakestGroup (kept as the single source of truth for
   those two calculations rather than re-implemented here).
   ============================================================ */
const LearningService = (() => {
  const R = (typeof Repositories !== 'undefined') ? Repositories : require('../repositories/repositories.js');
  const L = (typeof Logic !== 'undefined') ? Logic : require('../../logic.js');
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');

  /* ---------------- mastery per lesson ---------------- */
  async function getLessonMastery(lessonId){
    const progressList = await R.getLessonProgress();
    const progress = progressList.find(p=>p.id===lessonId) || null;
    return { lessonId, tier: L.masteryTier(progress || {}), progress };
  }

  /* ---------------- level progress ---------------- */
  async function getLevelProgress(level){
    const lessonsInLevel = R.lessonsForLevel(level);
    const progressList = await R.getLessonProgress();
    const byId = new Map(progressList.map(p=>[p.id,p]));
    let completed = 0, started = 0;
    lessonsInLevel.forEach(l=>{
      const p = byId.get(l.id);
      if(p && p.completed) completed++;
      else if(p) started++;
    });
    const total = lessonsInLevel.length || 1;
    return {
      level, totalLessons: lessonsInLevel.length, completed, started,
      completionPct: Math.round((completed/total)*100),
      meta: R.levelMeta(level),
    };
  }

  /* ---------------- weakness engine ---------------- */
  async function getWeakAreas(minAttempts){
    const attempts = await R.getAttempts();
    const grouped = L.aggregateAttempts(attempts);
    return L.weakestGroup(grouped, minAttempts||3);
  }

  /* ---------------- next lesson recommendation ---------------- */
  async function getNextLesson(level){
    const lessonsInLevel = R.lessonsForLevel(level);
    const progressList = await R.getLessonProgress();
    const completedIds = new Set(progressList.filter(p=>p.completed).map(p=>p.id));
    for(const lesson of lessonsInLevel){
      if(completedIds.has(lesson.id)) continue;
      const prereqsMet = (lesson.prereq||[]).every(id=>completedIds.has(id));
      if(prereqsMet) return lesson;
    }
    return null; // level complete, or a prerequisite gap exists that the UI should surface
  }

  /* ---------------- recommended practice ---------------- */
  async function getRecommendedPractice(level, count){
    const weak = await getWeakAreas(2);
    const lessonsInLevel = R.lessonsForLevel(level);
    const pool = [];
    lessonsInLevel.forEach(l=>(l.exercises||[]).forEach(ex=>{
      const score = weak.some(w=>w.group===L.groupCategory(ex.category)) ? 2 : 1;
      pool.push({ exercise:ex, lessonId:l.id, score });
    }));
    pool.sort((a,b)=>b.score-a.score);
    return pool.slice(0, count||10).map(p=>p.exercise);
  }

  /* ---------------- due reviews (delegates to SRS engine) ---------------- */
  async function getDueReviews(){
    if(typeof SRS === 'undefined') return [];
    const vocabProgress = await R.getVocabProgress();
    return vocabProgress.filter(v=>SRS.isDue(v));
  }

  /* ---------------- personalization / daily plan ---------------- */
  async function getLearnerContext(){ return R.buildLearnerContext(); }

  async function buildDailyPlan(minutesBudget){
    const attempts = await R.getAttempts();
    const lessonProgress = await R.getLessonProgress();
    const vocabProgress = await R.getVocabProgress();
    const ctx = await getLearnerContext();
    const level = ctx.currentLevel;
    const nextLesson = await getNextLesson(level);
    return L.buildDailyPlan({
      minutesBudget: minutesBudget || 20,
      dueWords: vocabProgress.filter(v=> typeof SRS!=='undefined' && SRS.isDue(v)),
      weakGroups: L.weakestGroup(L.aggregateAttempts(attempts), 2),
      nextLesson,
      lessonProgress,
    });
  }

  /* ---------------- weakness -> skill mapping (spec: skill model) ---------------- */
  async function getSkillProgress(){
    const raw = await R.getSkillProgress();
    const bySkill = {};
    S.SKILLS.forEach(sk=>{ bySkill[sk] = {correct:0, total:0}; });
    raw.forEach(r=>{ if(bySkill[r.id]){ bySkill[r.id].correct += r.correct; bySkill[r.id].total += r.total; } });
    const out = {};
    Object.keys(bySkill).forEach(sk=>{ const b=bySkill[sk]; out[sk] = b.total ? b.correct/b.total : null; });
    return out;
  }

  async function recordAttemptAndUpdateSkill(attempt){
    await R.recordAttempt(attempt);
    if(attempt.skill){
      await R.recordSkillProgress(attempt.skill, { correct: attempt.correct?1:0, total:1 });
    }
    return true;
  }

  return {
    getLessonMastery, getLevelProgress, getWeakAreas, getNextLesson,
    getRecommendedPractice, getDueReviews, getLearnerContext, buildDailyPlan,
    getSkillProgress, recordAttemptAndUpdateSkill,
  };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = LearningService; }

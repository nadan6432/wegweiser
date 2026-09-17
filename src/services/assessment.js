/* ============================================================
   ASSESSMENT SERVICE (spec: full placement/assessment architecture)
   Assembles level/unit/skill assessments by SAMPLING exercises
   already authored in the curriculum (ASSESSMENT_TEMPLATES from
   assessments.js declares how many items and from where), rather
   than duplicating exercise content — one generic function works
   for every level.
   ============================================================ */
const AssessmentService = (() => {
  const R = (typeof Repositories !== 'undefined') ? Repositories : require('../repositories/repositories.js');

  function shuffleSample(arr, n){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a.slice(0, n);
  }

  function templates(){
    return (typeof WEGWEISER!=='undefined' && WEGWEISER.ASSESSMENT_TEMPLATES) || {};
  }

  async function buildUnitAssessment(unitId){
    const t = templates().unit || {itemCount:8};
    const lessonsInUnit = R.lessonsForUnit(unitId);
    const pool = [];
    lessonsInUnit.forEach(l=>(l.exercises||[]).forEach(ex=>pool.push(ex)));
    return { unitId, type:'unit', items: shuffleSample(pool, t.itemCount), passThreshold: t.passThreshold };
  }

  async function buildLevelAssessment(level){
    const t = templates().level || {itemCount:20};
    const lessonsInLevel = R.lessonsForLevel(level);
    const weak = await LearningServiceWeak();
    const pool = [];
    lessonsInLevel.forEach(l=>(l.exercises||[]).forEach(ex=>{
      const weight = weak.has(ex.skill) ? 2 : 1;
      for(let i=0;i<weight;i++) pool.push(ex);
    }));
    return { level, type:'level', items: shuffleSample(pool, t.itemCount), passThreshold: t.passThreshold };
  }
  async function LearningServiceWeak(){
    try{
      const LS = (typeof LearningService!=='undefined') ? LearningService : require('./learning.js');
      const weak = await LS.getWeakAreas(2);
      return new Set(weak.map(w=>w.group));
    }catch(e){ return new Set(); }
  }

  async function buildSkillAssessment(skill, aroundLevel){
    const t = templates().skill || {itemCount:10};
    const pool = [];
    R.lessons().forEach(l=>{
      if(aroundLevel && l.level!==aroundLevel) return;
      (l.exercises||[]).forEach(ex=>{ if(ex.skill===skill) pool.push(ex); });
    });
    return { skill, type:'skill', items: shuffleSample(pool, t.itemCount), passThreshold: t.passThreshold };
  }

  function gradeMcqLike(item, answer){
    if(item.type==='mcq') return answer===item.correct;
    if(item.type==='fill') return (item.accept||[]).some(a=>String(answer||'').trim().toLowerCase()===a.toLowerCase());
    if(item.type==='match') return JSON.stringify(answer)===JSON.stringify(item.pairs);
    if(item.type==='correct') return (item.accept||[]).some(a=>String(answer||'').trim().toLowerCase()===a.toLowerCase());
    if(item.type==='build') return JSON.stringify(answer)===JSON.stringify(item.correctOrder);
    return false;
  }

  async function gradeAssessment(assessment, answers){
    let correct = 0;
    assessment.items.forEach((item,i)=>{ if(gradeMcqLike(item, answers[i])) correct++; });
    const total = assessment.items.length || 1;
    const score = correct/total;
    const passed = (assessment.passThreshold==null) ? null : score >= assessment.passThreshold;
    const result = { assessmentType:assessment.type, target: assessment.level||assessment.unitId||assessment.skill,
      correct, total, score, passed, ts: Date.now() };
    await R.recordAssessmentResult(result);
    return result;
  }

  return { buildUnitAssessment, buildLevelAssessment, buildSkillAssessment, gradeAssessment, gradeMcqLike };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = AssessmentService; }

/* ============================================================
   TEACHER CONTEXT SERVICE (spec §41-43: "Ask Teacher" context
   refs + learner context object, local only)
   Builds a stable, local-only reference object that a future
   Teacher provider (see providers.js TeacherService) can use to
   answer "why is this wrong / explain this / make this easier"
   without the app inventing an AI response itself. Nothing here
   sends data anywhere — building a reference is pure local logic.
   ============================================================ */
const TeacherContextService = (() => {
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');
  const R = (typeof Repositories !== 'undefined') ? Repositories : require('../repositories/repositories.js');

  function refForLesson(lessonId){ return S.teacherRef('lesson', lessonId); }
  function refForGrammar(grammarId){ return S.teacherRef('grammar', grammarId); }
  function refForVocab(vocabId){ return S.teacherRef('vocab', vocabId); }
  function refForExercise(exerciseId, lessonId){ return S.teacherRef('exercise', exerciseId, {lessonId}); }
  function refForMistake(mistakeId){ return S.teacherRef('mistake', mistakeId); }

  async function buildQuery(queryType, ref){
    if(S.TEACHER_QUERY_TYPES.indexOf(queryType)===-1){
      throw new Error('Unknown teacher query type: '+queryType);
    }
    const learnerContext = await R.buildLearnerContext();
    return { queryType, ref, learnerContext, schemaVersion: S.SCHEMA_VERSION };
  }

  return { refForLesson, refForGrammar, refForVocab, refForExercise, refForMistake, buildQuery };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = TeacherContextService; }

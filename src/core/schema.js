/* ============================================================
   SCHEMA — the single source of truth for what a Wegweiser
   content object looks like.

   Everything downstream (content packs, registry, repositories,
   validator, migrations) refers to the constants and factories
   here instead of hard-coding strings, so adding a level, a
   skill or an exercise type is a one-line change in this file
   rather than a search-and-replace across the codebase.
   ============================================================ */
const Schema = (() => {

  /* Bumped when the SHAPE of content changes (fields added/renamed).
     Content packages declare the schema they were authored against so a
     future update can refuse or migrate an incompatible package. */
  const SCHEMA_VERSION = 3;
  /* Bumped when the CONTENT changes but the shape does not. */
  const CONTENT_VERSION = '3.0.0';

  /* Ordered CEFR ladder. A0 is a pre-CEFR foundation level: it is not an
     official Council of Europe level, and the app must not present it as one. */
  const LEVELS = ['A0','A1','A2','B1','B2','C1','C2'];
  const OFFICIAL_CEFR = ['A1','A2','B1','B2','C1','C2'];
  function levelIndex(l){ return LEVELS.indexOf(l); }
  function isBelow(a, b){ return levelIndex(a) < levelIndex(b); }
  function nextLevel(l){ return LEVELS[levelIndex(l)+1] || null; }
  function prevLevel(l){ return LEVELS[levelIndex(l)-1] || null; }

  /* The skill model. Overall level is never derived from one skill alone. */
  const SKILLS = ['vocabulary','grammar','reading','writing','listening','speaking','pronunciation','conversation'];

  /* Weakness buckets — the vocabulary the learner-facing dashboard speaks. */
  const WEAKNESS_AREAS = [
    'vocabulary','grammar','articles','gender','cases','wordOrder',
    'verbForms','spelling','reading','writing','listening','speaking','pronunciation',
  ];

  /* Mastery ladder. Deliberately more than "done / not done". */
  const MASTERY_STATES = ['not-started','started','needs-review','developing','strong','mastered'];

  /* SRS lifecycle states. */
  const SRS_STATES = ['new','learning','review','due','overdue','mastered'];

  /* Canonical exercise types the renderer understands. Authoring subtypes
     (articleSelection, verbConjugation, translation, …) are richer and are
     kept in `subtype` for analytics and future specialised renderers, but
     every exercise collapses to one of these five for rendering. */
  const EXERCISE_TYPES = ['mcq','fill','build','match','correct'];
  const EXERCISE_SUBTYPES = [
    'multipleChoice','fillBlank','shortAnswer','matching','ordering','sentenceBuilding',
    'translation','articleSelection','genderSelection','verbConjugation','correction',
    'readingComprehension','dialogueCompletion','categorization','writing',
    'speakingReady','listeningReady',
  ];

  const DIFFICULTIES = ['easy','normal','challenging','advanced'];

  /* Real-life pathways. Tags, never duplicated curricula (spec §45). */
  const PATHWAYS = ['everyday','germany','ausbildung','work','university','travel','goethe','telc','oesd'];

  /* Content pack identifiers. */
  const PACKS = ['core','a0','a1','a2','b1','b2','c1','c2','exam','professional'];

  /* Explanation languages. German is always the SOURCE language; these are
     only the languages an explanation/translation may be rendered in. */
  const EXPLANATION_LANGS = ['en','ur','ps','de'];

  /* ---------------- ID conventions ----------------
     level_a1 / unit_a1_01 / lsn_a1_01_02 / v_tisch / g_akkusativ /
     ex_lsn_a1_01_02_3 / r_a1_familie / wr_a2_email / li_a1_termin /
     sp_a1_vorstellen / cv_a1_restaurant / as_a1_unit01 / xm_goethe_a1_lesen_1
     Prefixes are checked by the validator so a typo surfaces at load time. */
  const ID_PREFIX = {
    level:'level_', unit:'unit_', lesson:'lsn_', vocab:'v_', grammar:'g_',
    exercise:'ex_', reading:'r_', writing:'wr_', listening:'li_', speaking:'sp_',
    conversation:'cv_', assessment:'as_', examTask:'xm_', mistake:'mk_', objective:'obj_',
  };

  function slug(s){
    return String(s).toLowerCase()
      .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
      .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  }

  /* Metadata block every content record carries (spec §7, §82).
     `reviewed` defaults to false and must never be set true for content that
     has not actually been reviewed by a human. */
  function meta(overrides){
    return Object.assign({
      schemaVersion: SCHEMA_VERSION,
      contentVersion: CONTENT_VERSION,
      author: 'wegweiser-core',
      source: 'original',
      reviewed: false,
      reviewStatus: 'unreviewed',
      status: 'published',
      lang: 'de',
      explanationLang: 'en',
      createdAt: null,
      updatedAt: null,
    }, overrides||{});
  }

  /* ---------------- normalisation of authored records ----------------
     Content packs may omit anything optional; these functions fill in the
     defaults so downstream code can rely on fields existing. */

  function normalizeVocab(v){
    return Object.assign({
      id:null, de:'', lemma:v.lemma || v.de, article:'', plural:'', en:'',
      type:'noun', level:'A1', topic:'general', subtopic:null,
      ex_de:'', ex_en:'', examples:[], phrases:[], collocations:[],
      related:[], opposites:[], synonyms:[], commonMistakes:[],
      grammarIds:[], lessonIds:[], forms:null, pathways:[],
      frequency:3, translations:{}, meta:meta(),
    }, v);
  }

  function normalizeGrammar(g){
    return Object.assign({
      id:null, title:'', level:'A1', category:'grammar', explanation:'',
      pattern:'', rules:[], examples:[], negativeExamples:[], mistakes:[],
      exceptions:[], prereq:[], vocabIds:[], lessonIds:[], exerciseIds:[],
      reviewRules:{intervalBoost:1.0, minAttempts:4}, pathways:[], meta:meta(),
    }, g);
  }

  function normalizeLesson(l){
    return Object.assign({
      id:null, title:'', level:'A1', unitId:null, order:0, topic:'general',
      goal:'', why:'', intro:'', prereq:[], estimatedMinutes:15,
      objectives:[], vocabIds:[], grammarId:null, grammarIds:[],
      teach:[], commonMistake:'', sentenceProgression:null,
      guided:[], exercises:[], realLife:null,
      readingIds:[], writingIds:[], listeningIds:[], speakingIds:[], conversationIds:[],
      assessmentId:null, summary:[], skills:['grammar','vocabulary'],
      difficulty:'normal', pathways:['everyday'], pack:'core', meta:meta(),
    }, l);
  }

  /* ---------------- teacher context references (spec §41) ----------------
     Every learning object can produce a stable reference that a future
     Teacher service consumes. Building the reference is free and local;
     nothing is transmitted anywhere. */
  function teacherRef(kind, id, extra){
    return Object.assign({ kind, id, schemaVersion: SCHEMA_VERSION }, extra||{});
  }

  const TEACHER_QUERY_TYPES = [
    'explain','why-wrong','give-example','make-easier','make-harder','translate',
    'correct','practice','review','quiz-me','explain-grammar','explain-vocabulary',
  ];

  return {
    SCHEMA_VERSION, CONTENT_VERSION, LEVELS, OFFICIAL_CEFR, SKILLS, WEAKNESS_AREAS,
    MASTERY_STATES, SRS_STATES, EXERCISE_TYPES, EXERCISE_SUBTYPES, DIFFICULTIES,
    PATHWAYS, PACKS, EXPLANATION_LANGS, ID_PREFIX, TEACHER_QUERY_TYPES,
    levelIndex, isBelow, nextLevel, prevLevel, slug, meta,
    normalizeVocab, normalizeGrammar, normalizeLesson, teacherRef,
  };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = Schema; }

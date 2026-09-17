/* ============================================================
   REGISTRY (spec §47, §48, §46)
   Assembles the final content graph and exposes it under the
   SAME global names app.js already reads (VOCAB, LESSONS,
   GRAMMAR, PLACEMENT_TEST, READING_TEXTS, ...), so no UI code
   has to change to benefit from the expanded content.

   IMPORTANT — why this file uses bare identifiers, not window.X:
   data.js/content2.js declare VOCAB, LESSONS, GRAMMAR, etc. with
   `const`. A top-level `const` in a classic <script> creates a
   binding in the shared Global Declarative Environment, which is
   NOT a property of `window` and is checked BEFORE window
   properties during identifier lookup. Two consequences:
     1) `window.VOCAB` is undefined even after data.js has run —
        so reading legacy content here must use the bare
        identifier `VOCAB`, not a property lookup.
     2) `window.VOCAB = newArray` would not change what later
        scripts see when they reference the bare identifier
        `VOCAB` — so publishing merged content must MUTATE the
        same array in place, not reassign the binding.
   Every content file in src/content/*.js has already run by the
   time this file runs (see index.html script order), so their
   `const EXPORT_NAME = …` bindings are directly visible here via
   normal lexical scoping — exactly like a later statement in the
   same <script> would see them.
   ============================================================ */
(function(){

  function normKey(de){
    return String(de||'').toLowerCase()
      .replace(/^(der|die|das)\s+/,'')
      .replace(/[.,!?;:]/g,'').trim();
  }

  function mergeVocab(legacyVocab, newVocab){
    const out = [], seenKey = new Set(), seenId = new Set();
    newVocab.forEach(v=>{ if(!seenId.has(v.id)){ out.push(v); seenId.add(v.id); seenKey.add(normKey(v.de)); } });
    legacyVocab.forEach(v=>{
      const k = normKey(v.de);
      if(seenId.has(v.id) || seenKey.has(k)) return;
      out.push(v); seenId.add(v.id); seenKey.add(k);
    });
    return out;
  }

  function mergeById(legacyArr, newArr){
    const out = [], seen = new Set();
    (newArr||[]).forEach(x=>{ if(!seen.has(x.id)){ out.push(x); seen.add(x.id); } });
    (legacyArr||[]).forEach(x=>{ if(!seen.has(x.id)){ out.push(x); seen.add(x.id); } });
    return out;
  }

  function mergeLessons(legacyLessons, newLessons){
    const out = [], seen = new Set();
    newLessons.forEach(l=>{ out.push(l); seen.add(l.id); });
    (legacyLessons||[]).forEach(l=>{ if(!seen.has(l.id)){ out.push(l); seen.add(l.id); } });
    return out;
  }

  function adaptTextItem(item){
    return {
      id: item.id, level: item.level, title: item.title,
      topic: item.textType || item.situation || 'general',
      text: item.text, transcript: item.transcript,
      questions: (item.questions||[])
        .filter(q => q.options && q.correct)
        .map((q,i)=>({ id:(item.id+'_q'+(i+1)), prompt:q.q||q.prompt, options:q.options, correct:q.correct })),
    };
  }
  function adaptWriting(list){
    return list.map(p=>({
      id: p.id, level: p.level, title: p.title,
      type: String(p.textType||'text').split(/[\s/]/)[0].toLowerCase(),
      prompt: p.task, minWords: p.minWords,
    }));
  }

  function flattenConversation(scenario){
    const order = [], indexOf = {};
    (function visit(nodeId){
      if(indexOf[nodeId]!==undefined || nodeId==='end') return;
      indexOf[nodeId] = order.length;
      order.push(nodeId);
      const node = scenario.nodes[nodeId];
      (node.choices||[]).forEach(c=>{ if(c.next && c.next!=='end') visit(c.next); });
    })(scenario.startNode);

    const steps = order.map(nodeId=>{
      const node = scenario.nodes[nodeId];
      return {
        npc: node.text,
        options: (node.choices||[]).map(c=>({
          text: c.text, note: c.feedback,
          nextIndex: (c.next==='end' || !c.next) ? order.length : indexOf[c.next],
        })),
      };
    });
    return { id:scenario.id, level:scenario.level, title:scenario.title,
      topic:(scenario.pathways&&scenario.pathways[0])||'everyday', steps };
  }

  function flattenPlacementTest(sectioned){
    const out = [];
    (sectioned.sections||[]).forEach(sec=>{
      sec.questions.forEach((q,i)=>{
        out.push({ id:'pl_'+sec.level.toLowerCase()+'_'+(i+1), level:sec.level, category:'mixed',
          prompt:q.q, options:q.options, correct:q.correct });
      });
    });
    return out;
  }

  function replaceArrayInPlace(arr, values){
    if(!Array.isArray(arr)) return values;
    arr.length = 0;
    values.forEach(v=>arr.push(v));
    return arr;
  }

  /* Node fallback: when this file is `require`d directly (as the tests
     and the tools_check_registry.js sanity script do) rather than loaded
     as a <script>, pull each piece from its own module instead of
     relying on shared script-scope bindings. */
  function nodeRequire(path){ try{ return require(path); }catch(e){ return null; } }
  const isNode = (typeof module !== 'undefined' && module.exports && typeof window === 'undefined');

  function gather(){
    if(isNode){
      const dataMod = nodeRequire('../../data.node.js'); // optional; browser data.js isn't require()-able
      const VOCAB = (dataMod && dataMod.VOCAB) || [];
      const LESSONS = (dataMod && dataMod.LESSONS) || [];
      const GRAMMAR = (dataMod && dataMod.GRAMMAR) || [];
      const PLACEMENT_TEST = (dataMod && dataMod.PLACEMENT_TEST) || [];
      const content2Mod = nodeRequire('../../content2.node.js');
      const READING_TEXTS = (content2Mod && content2Mod.READING_TEXTS) || [];
      const LISTENING_ITEMS = (content2Mod && content2Mod.LISTENING_ITEMS) || [];
      const WRITING_PROMPTS = (content2Mod && content2Mod.WRITING_PROMPTS) || [];
      const CONVERSATION_SCENARIOS = (content2Mod && content2Mod.CONVERSATION_SCENARIOS) || [];
      const EXAM_FRAMEWORKS = (content2Mod && content2Mod.EXAM_FRAMEWORKS) || [];

      const VOCAB_CORE = (nodeRequire('./vocabulary.core.js')||{}).VOCAB_CORE || [];
      const VOCAB_UPPER = (nodeRequire('./vocabulary.upper.js')||{}).VOCAB_UPPER || [];
      const GRAMMAR_DB = (nodeRequire('./grammar.js')||{}).GRAMMAR_DB || [];
      const CURRICULUM_A0A1 = nodeRequire('./lessons.a0a1.js') || {A0:{units:[],lessons:[]},A1:{units:[],lessons:[]}};
      const CURRICULUM_A2 = (nodeRequire('./lessons.a2.js')||{}).CURRICULUM_A2 || {units:[],lessons:[]};
      const CURRICULUM_B1 = (nodeRequire('./lessons.b1.js')||{}).CURRICULUM_B1 || {units:[],lessons:[]};
      const b2c1c2 = nodeRequire('./lessons.b2c1c2.js') || {B2:{units:[],lessons:[]},C1:{units:[],lessons:[]},C2:{units:[],lessons:[]}};
      const READING_TEXTS_RICH = (nodeRequire('./reading.js')||{}).READING_TEXTS_RICH || [];
      const LISTENING_ITEMS_RICH = (nodeRequire('./listening.js')||{}).LISTENING_ITEMS_RICH || [];
      const WRITING_PROMPTS_RICH = (nodeRequire('./writing.js')||{}).WRITING_PROMPTS_RICH || [];
      const CONVERSATION_SCENARIOS_RICH = (nodeRequire('./conversation.js')||{}).CONVERSATION_SCENARIOS_RICH || [];
      const ASSESSMENTS = nodeRequire('./assessments.js') || {};
      const COMMON_MISTAKES = (nodeRequire('./mistakes.js')||{}).COMMON_MISTAKES || [];
      const SPEAKING_TASKS = (nodeRequire('./speaking.js')||{}).SPEAKING_TASKS || [];
      const LEVEL_META = (nodeRequire('./levels.js')||{}).LEVEL_META || [];
      const ManifestMod = nodeRequire('./manifest.js');

      return { VOCAB, LESSONS, GRAMMAR, PLACEMENT_TEST, READING_TEXTS, LISTENING_ITEMS,
        WRITING_PROMPTS, CONVERSATION_SCENARIOS, EXAM_FRAMEWORKS,
        VOCAB_CORE, VOCAB_UPPER, GRAMMAR_DB,
        A0: CURRICULUM_A0A1.A0, A1: CURRICULUM_A0A1.A1, A2: CURRICULUM_A2, B1: CURRICULUM_B1,
        B2: b2c1c2.B2, C1: b2c1c2.C1, C2: b2c1c2.C2,
        READING_TEXTS_RICH, LISTENING_ITEMS_RICH, WRITING_PROMPTS_RICH, CONVERSATION_SCENARIOS_RICH,
        ASSESSMENTS, COMMON_MISTAKES, SPEAKING_TASKS, LEVEL_META, ManifestMod };
    }

    /* Browser: every identifier below is a bare reference to a global
       `const`/`var` declared by an earlier <script>, resolved through
       normal lexical scoping (see the file header for why this matters). */
    /* eslint-disable no-undef */
    return {
      VOCAB: (typeof VOCAB!=='undefined')?VOCAB:[],
      LESSONS: (typeof LESSONS!=='undefined')?LESSONS:[],
      GRAMMAR: (typeof GRAMMAR!=='undefined')?GRAMMAR:[],
      PLACEMENT_TEST: (typeof PLACEMENT_TEST!=='undefined')?PLACEMENT_TEST:[],
      READING_TEXTS: (typeof READING_TEXTS!=='undefined')?READING_TEXTS:[],
      LISTENING_ITEMS: (typeof LISTENING_ITEMS!=='undefined')?LISTENING_ITEMS:[],
      WRITING_PROMPTS: (typeof WRITING_PROMPTS!=='undefined')?WRITING_PROMPTS:[],
      CONVERSATION_SCENARIOS: (typeof CONVERSATION_SCENARIOS!=='undefined')?CONVERSATION_SCENARIOS:[],
      EXAM_FRAMEWORKS: (typeof EXAM_FRAMEWORKS!=='undefined')?EXAM_FRAMEWORKS:[],
      VOCAB_CORE: (typeof VOCAB_CORE!=='undefined')?VOCAB_CORE:[],
      VOCAB_UPPER: (typeof VOCAB_UPPER!=='undefined')?VOCAB_UPPER:[],
      GRAMMAR_DB: (typeof GRAMMAR_DB!=='undefined')?GRAMMAR_DB:[],
      A0: (typeof CURRICULUM_A0A1!=='undefined')?CURRICULUM_A0A1.A0:{units:[],lessons:[]},
      A1: (typeof CURRICULUM_A0A1!=='undefined')?CURRICULUM_A0A1.A1:{units:[],lessons:[]},
      A2: (typeof CURRICULUM_A2!=='undefined')?CURRICULUM_A2:{units:[],lessons:[]},
      B1: (typeof CURRICULUM_B1!=='undefined')?CURRICULUM_B1:{units:[],lessons:[]},
      B2: (typeof CURRICULUM_B2C1C2!=='undefined')?CURRICULUM_B2C1C2.B2:{units:[],lessons:[]},
      C1: (typeof CURRICULUM_B2C1C2!=='undefined')?CURRICULUM_B2C1C2.C1:{units:[],lessons:[]},
      C2: (typeof CURRICULUM_B2C1C2!=='undefined')?CURRICULUM_B2C1C2.C2:{units:[],lessons:[]},
      READING_TEXTS_RICH: (typeof READING_TEXTS_RICH!=='undefined')?READING_TEXTS_RICH:[],
      LISTENING_ITEMS_RICH: (typeof LISTENING_ITEMS_RICH!=='undefined')?LISTENING_ITEMS_RICH:[],
      WRITING_PROMPTS_RICH: (typeof WRITING_PROMPTS_RICH!=='undefined')?WRITING_PROMPTS_RICH:[],
      CONVERSATION_SCENARIOS_RICH: (typeof CONVERSATION_SCENARIOS_RICH!=='undefined')?CONVERSATION_SCENARIOS_RICH:[],
      ASSESSMENTS: (typeof ASSESSMENTS!=='undefined')?ASSESSMENTS:{},
      COMMON_MISTAKES: (typeof COMMON_MISTAKES!=='undefined')?COMMON_MISTAKES:[],
      SPEAKING_TASKS: (typeof SPEAKING_TASKS!=='undefined')?SPEAKING_TASKS:[],
      LEVEL_META: (typeof LEVEL_META!=='undefined')?LEVEL_META:[],
      ManifestMod: (typeof Manifest!=='undefined')?Manifest:null,
    };
    /* eslint-enable no-undef */
  }

  function build(){
    const s = gather();
    const allUnits = [].concat(s.A0.units,s.A1.units,s.A2.units,s.B1.units,s.B2.units,s.C1.units,s.C2.units);
    const allNewLessons = [].concat(s.A0.lessons,s.A1.lessons,s.A2.lessons,s.B1.lessons,s.B2.lessons,s.C1.lessons,s.C2.lessons);
    const newVocab = [].concat(s.VOCAB_CORE, s.VOCAB_UPPER);

    const VOCAB = mergeVocab(s.VOCAB, newVocab);
    const GRAMMAR = mergeById(s.GRAMMAR, s.GRAMMAR_DB);
    const LESSONS = mergeLessons(s.LESSONS, allNewLessons);
    const READING_TEXTS = mergeById(s.READING_TEXTS, s.READING_TEXTS_RICH.map(adaptTextItem));
    const LISTENING_ITEMS = mergeById(s.LISTENING_ITEMS, s.LISTENING_ITEMS_RICH.map(adaptTextItem));
    const WRITING_PROMPTS = mergeById(s.WRITING_PROMPTS, adaptWriting(s.WRITING_PROMPTS_RICH));
    const CONVERSATION_SCENARIOS = mergeById(s.CONVERSATION_SCENARIOS, s.CONVERSATION_SCENARIOS_RICH.map(flattenConversation));
    const PLACEMENT_TEST = (s.ASSESSMENTS && s.ASSESSMENTS.PLACEMENT_TEST)
      ? s.PLACEMENT_TEST.concat(flattenPlacementTest(s.ASSESSMENTS.PLACEMENT_TEST)) : s.PLACEMENT_TEST;
    const EXAM_FRAMEWORKS = (s.ASSESSMENTS && s.ASSESSMENTS.EXAM_FRAMEWORKS)
      ? mergeById(s.EXAM_FRAMEWORKS, s.ASSESSMENTS.EXAM_FRAMEWORKS.map(f=>({id:f.id,name:f.name,levels:f.levels})))
      : s.EXAM_FRAMEWORKS;
    /* CEFR_LEVELS is deliberately left untouched (still the original
       ['A1',...,'C2']): Logic.computePlacementResult walks this array
       from the bottom, and the placement test itself has no A0 questions,
       so prepending 'A0' here would make every placement estimate stick
       at 'A0' (the loop's own fallback default) instead of climbing.
       A0 is a real, additional foundation level for the curriculum and
       the level-selector UI — just not part of the placement-test ladder,
       exactly like Schema.OFFICIAL_CEFR already distinguishes it. */
    const CEFR_LEVELS_ALL = ['A0','A1','A2','B1','B2','C1','C2'];

    const counts = {
      levels: CEFR_LEVELS_ALL.length, units: allUnits.length, lessons: LESSONS.length,
      vocab: VOCAB.length, grammar: GRAMMAR.length,
      exercises: LESSONS.reduce((n,l)=>n+((l.exercises||[]).length),0),
      reading: READING_TEXTS.length, writing: WRITING_PROMPTS.length,
      listening: LISTENING_ITEMS.length, conversation: CONVERSATION_SCENARIOS.length,
      speaking: s.SPEAKING_TASKS.length, mistakes: s.COMMON_MISTAKES.length,
      examTasks: (s.ASSESSMENTS && s.ASSESSMENTS.EXAM_TASKS) ? s.ASSESSMENTS.EXAM_TASKS.length : 0,
    };
    const manifest = s.ManifestMod ? s.ManifestMod.build(counts) : {counts};

    return { VOCAB, GRAMMAR, LESSONS, UNITS: allUnits, CEFR_LEVELS_ALL, LEVEL_META: s.LEVEL_META,
      PLACEMENT_TEST, READING_TEXTS, LISTENING_ITEMS, WRITING_PROMPTS, CONVERSATION_SCENARIOS,
      EXAM_FRAMEWORKS, EXAM_TASKS: (s.ASSESSMENTS&&s.ASSESSMENTS.EXAM_TASKS)||[],
      ASSESSMENT_TEMPLATES: (s.ASSESSMENTS&&s.ASSESSMENTS.ASSESSMENT_TEMPLATES)||{},
      COMMON_MISTAKES: s.COMMON_MISTAKES, SPEAKING_TASKS: s.SPEAKING_TASKS, counts, manifest };
  }

  function apply(){
    const merged = build();
    if(typeof VOCAB !== 'undefined') replaceArrayInPlace(VOCAB, merged.VOCAB);
    if(typeof GRAMMAR !== 'undefined') replaceArrayInPlace(GRAMMAR, merged.GRAMMAR);
    if(typeof LESSONS !== 'undefined') replaceArrayInPlace(LESSONS, merged.LESSONS);
    if(typeof PLACEMENT_TEST !== 'undefined') replaceArrayInPlace(PLACEMENT_TEST, merged.PLACEMENT_TEST);
    if(typeof READING_TEXTS !== 'undefined') replaceArrayInPlace(READING_TEXTS, merged.READING_TEXTS);
    if(typeof LISTENING_ITEMS !== 'undefined') replaceArrayInPlace(LISTENING_ITEMS, merged.LISTENING_ITEMS);
    if(typeof WRITING_PROMPTS !== 'undefined') replaceArrayInPlace(WRITING_PROMPTS, merged.WRITING_PROMPTS);
    if(typeof CONVERSATION_SCENARIOS !== 'undefined') replaceArrayInPlace(CONVERSATION_SCENARIOS, merged.CONVERSATION_SCENARIOS);
    if(typeof EXAM_FRAMEWORKS !== 'undefined') replaceArrayInPlace(EXAM_FRAMEWORKS, merged.EXAM_FRAMEWORKS);
    /* CEFR_LEVELS is intentionally NOT touched — see the comment in build(). */

    const ns = { UNITS: merged.UNITS, LEVEL_META: merged.LEVEL_META, EXAM_TASKS: merged.EXAM_TASKS,
      ASSESSMENT_TEMPLATES: merged.ASSESSMENT_TEMPLATES, counts: merged.counts, manifest: merged.manifest,
      CEFR_LEVELS_ALL: merged.CEFR_LEVELS_ALL };
    if(typeof window !== 'undefined'){ window.WEGWEISER = ns; }
    else if(typeof global !== 'undefined'){ global.WEGWEISER = ns; }
    return merged;
  }

  const RegistryExport = { build, apply, mergeVocab, mergeById, mergeLessons, flattenConversation, flattenPlacementTest };
  if(typeof window !== 'undefined'){ window.Registry = RegistryExport; }
  if(typeof module !== 'undefined' && module.exports){ module.exports = RegistryExport; }
  if(typeof globalThis !== 'undefined' && typeof window === 'undefined'){ globalThis.Registry = RegistryExport; }

})();

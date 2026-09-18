/* ============================================================
   LOGIC — pure, DOM-free functions shared by the app and by the
   automated test suite (see /tests). Nothing in this file touches
   the DOM, IndexedDB, or global mutable App state — every function
   takes its inputs as arguments and returns a value, so it can be
   required directly from Node for testing without a browser.
   ============================================================ */
const Logic = (() => {

  function normalize(s){
    return String(s).toLowerCase().trim()
      .replace(/ß/g,'ss')
      .replace(/[.,!?;:]/g,'')
      .replace(/\s+/g,' ');
  }

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  /* ---------------- weakness-category grouping ----------------
     Raw exercise categories (as authored in data.js) are fairly
     granular (akkusativ, dativ, verb-conjugation, modal-verbs...).
     The weakness engine additionally rolls these up into the
     broader buckets a learner-facing dashboard should distinguish:
     vocabulary, grammar, word order, articles/gender, cases, verb forms.
     Grouping first means a learner needs fewer total attempts before
     a real weak spot (e.g. "cases" as a whole) becomes statistically
     visible, rather than splitting evidence thinly across akkusativ
     and dativ separately. */
  const CATEGORY_GROUPS = {
    'vocab':'vocabulary', 'greetings':'vocabulary',
    'articles':'articles-gender',
    'akkusativ':'cases', 'dativ':'cases',
    'verb-conjugation':'verb-forms', 'modal-verbs':'verb-forms', 'perfekt':'verb-forms',
    'word-order':'word-order',
    'pronunciation':'pronunciation',
    'grammar':'grammar',
  };
  function groupCategory(cat){ return CATEGORY_GROUPS[cat] || 'grammar'; }

  const CATEGORY_LABELS = {
    'akkusativ':'the Accusative case','dativ':'the Dative case','articles':'noun genders / articles',
    'verb-conjugation':'verb conjugation','word-order':'word order','modal-verbs':'modal verbs',
    'perfekt':'the Perfekt (past tense)','pronunciation':'pronunciation','vocab':'vocabulary',
    'grammar':'grammar','greetings':'greetings',
  };
  function labelForCategory(cat){ return CATEGORY_LABELS[cat] || cat; }

  const GROUP_LABELS = {
    'vocabulary':'vocabulary', 'articles-gender':'noun genders / articles',
    'cases':'grammatical cases (Akkusativ/Dativ)', 'verb-forms':'verb forms',
    'word-order':'word order', 'pronunciation':'pronunciation', 'grammar':'grammar',
  };
  function labelForGroup(group){ return GROUP_LABELS[group] || group; }

  /* Aggregate a flat list of {category, correct} attempt records into
     both raw-category and grouped-bucket accuracy tables. */
  function aggregateAttempts(attempts){
    const raw = {};
    const grouped = {};
    attempts.forEach(a=>{
      raw[a.category] = raw[a.category] || {correct:0,total:0};
      raw[a.category].total++;
      if(a.correct) raw[a.category].correct++;

      const g = groupCategory(a.category);
      grouped[g] = grouped[g] || {correct:0,total:0};
      grouped[g].total++;
      if(a.correct) grouped[g].correct++;
    });
    return {raw, grouped};
  }

  /* Pick the weakest bucket with enough evidence (minAttempts) to be
     meaningful, from a grouped-stats table as produced by aggregateAttempts. */
  function weakestGroup(grouped, minAttempts){
    minAttempts = minAttempts || 3;
    let worst = null, worstPct = 1.01;
    Object.entries(grouped||{}).forEach(([g,s])=>{
      if(s.total >= minAttempts){
        const pct = s.correct/s.total;
        if(pct < worstPct){ worstPct = pct; worst = g; }
      }
    });
    return worst;
  }

  /* ---------------- placement test scoring ----------------
     Pure function: given the learner's answers and the placement
     test bank + level ordering, returns the same deterministic
     result every time for the same inputs (no randomness, no
     hidden state). estimated level = the highest CEFR level for
     which the learner scored >= 60% AND all lower levels tested
     were also >= 60% (a single weak lower level caps the estimate,
     so a lucky guess on a hard question can't inflate the result). */
  function computePlacementResult(answers, placementTest, cefrLevelsAscending){
    const byLevel = {};
    const byCategory = {};
    answers.forEach(a=>{
      const q = placementTest.find(x=>x.id===a.qid);
      if(!q) return;
      byLevel[q.level] = byLevel[q.level] || {correct:0,total:0};
      byLevel[q.level].total++;
      if(a.correct) byLevel[q.level].correct++;
      byCategory[q.category] = byCategory[q.category] || {correct:0,total:0};
      byCategory[q.category].total++;
      if(a.correct) byCategory[q.category].correct++;
    });
    let estimated = 'A0';
    for(const lvl of cefrLevelsAscending){
      const b = byLevel[lvl];
      if(!b || b.total===0) break; // no data for this level (or beyond) — stop climbing
      const pct = b.correct/b.total;
      if(pct >= 0.6){ estimated = lvl; } else { break; } // a weak level caps the estimate
    }
    return {level:estimated, byLevel, byCategory};
  }

  /* ---------------- daily plan builder ----------------
     Priority order (highest first): overdue reviews > weakest area >
     continuing the current lesson > new material (once everything
     current is done). Always respects the learner's total daily
     time budget — line items are proportional slices of `minutes`,
     never a sum that runs over it. */
  function buildDailyPlan(opts){
    const minutes = Math.max(1, opts.minutes||15);
    const due = opts.due||0;
    const weakGroupLabel = opts.weakGroupLabel||null;
    const nextLessonTitle = opts.nextLessonTitle||null;
    const allLessonsDone = !!opts.allLessonsDone;
    const newWordsAvailable = opts.newWordsAvailable||0;

    const plan = [];
    let remaining = minutes;

    if(due > 0){
      const m = Math.min(Math.max(3, Math.round(minutes*0.35)), remaining);
      plan.push({key:'review', label:`Review ${Math.min(due,20)} due word${due===1?'':'s'}`, minutes:m});
      remaining -= m;
    }
    if(weakGroupLabel && remaining > 0){
      const m = Math.min(Math.max(2, Math.round(minutes*0.3)), remaining);
      plan.push({key:'weak', label:`Practice: ${weakGroupLabel}`, minutes:m});
      remaining -= m;
    }
    if(!allLessonsDone && nextLessonTitle && remaining > 0){
      plan.push({key:'lesson', label:`Lesson: ${nextLessonTitle}`, minutes:remaining});
      remaining = 0;
    } else if(remaining > 0){
      if(newWordsAvailable > 0){
        plan.push({key:'new', label:`Learn ${Math.min(newWordsAvailable,10)} new words`, minutes:remaining});
      } else {
        plan.push({key:'free', label:`Free review — revisit the Grammar Lab`, minutes:remaining});
      }
      remaining = 0;
    }
    return plan;
  }

  /* ---------------- lesson mastery tiers ----------------
     Turns a single completion boolean + score into a human-meaningful
     tier, per the "mastery should mean more than opened the lesson"
     requirement. Pure function of {completed, bestScore} so it's
     independently testable and reusable everywhere it's displayed. */
  function masteryTier(progress){
    if(!progress) return 'Not started';
    if(!progress.completed) return 'Started';
    const s = progress.bestScore||0;
    if(s>=1) return 'Mastered';
    if(s>=0.75) return 'Strong';
    if(s>=0.5) return 'Developing';
    return 'Needs review';
  }
  const MASTERY_COLORS = {
    'Not started':'var(--text-dim)', 'Started':'var(--text-dim)', 'Needs review':'var(--brick)',
    'Developing':'var(--gold)', 'Strong':'var(--gold)', 'Mastered':'var(--teal)',
  };
  function masteryColor(tier){ return MASTERY_COLORS[tier] || 'var(--text-dim)'; }

  return {
    normalize, shuffle,
    groupCategory, labelForCategory, labelForGroup, aggregateAttempts, weakestGroup,
    computePlacementResult, buildDailyPlan, masteryTier, masteryColor,
  };
})();

/* Node/CommonJS export for the test suite; harmless in the browser
   (module is undefined there, so this line never runs). */
if(typeof module !== 'undefined' && module.exports){ module.exports = Logic; }

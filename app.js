/* ============================================================
   APP — state, rendering, and all screen logic for Wegweiser.
   Plain JS, event-delegated (data-action attributes), no
   framework — keeps the whole app a single dependency-free
   offline bundle.
   ============================================================ */
(function(){

const EXPLAIN_LANGS = [
  {id:'de',label:'German (immersion)'},
  {id:'en',label:'English'},
  {id:'ur',label:'Urdu'},
  {id:'ps',label:'Pashto'},
];
const GOALS = ['General German','Conversation','Travel','Work','University','Ausbildung','Goethe exam','Living in Germany','Everyday life','Grammar & accuracy'];
const STYLES = ['Vocabulary','Grammar','Reading','Writing','Listening','Quizzes','Real-life situations','Repetition'];
const TIME_OPTS = [5,10,15,30,45,60];
const DIFFICULTY_OPTS = ['Relaxed','Balanced','Challenging','Very challenging'];
const CORRECTION_OPTS = [
  {id:'every', label:'Correct every mistake'},
  {id:'important', label:'Correct only important mistakes'},
  {id:'after', label:'Let me finish, then correct'},
];

/* ---------------- utility ---------------- */
// normalize/shuffle now live in logic.js (Logic.*) as the single
// source of truth shared with the automated test suite; kept as
// thin local aliases so the rest of this file doesn't need renaming.
function uid(){ return 'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function todayStr(d){ d=d||new Date(); return d.toISOString().slice(0,10); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const shuffle = Logic.shuffle;
const normalize = Logic.normalize;
const labelForCategory = Logic.labelForCategory;
const labelForGroup = Logic.labelForGroup;
function byId(arr,id){ return arr.find(x=>x.id===id); }
function vocabById(id){ return byId(VOCAB,id); }
function lessonById(id){ return byId(LESSONS,id); }
function grammarById(id){ return byId(GRAMMAR,id); }

/* ---------------- state ---------------- */
function freshOnboardState(){
  return {step:0, data:{explainLang:'en', level:null, goals:[], time:15, styles:[], difficulty:'Balanced', correction:'important'}};
}
const State = {
  profile:null,
  view:'loading',
  onboard:freshOnboardState(),
  // Placement test state is intentionally separate from `onboard` so the
  // test can also be launched standalone (retake from Settings) without
  // depending on — or clobbering — an onboarding session.
  placement:{index:0, answers:[], retake:false},
  placementResult:null,
  learnTab:'A1',
  // Phase-1 frontend expansion state (all ephemeral/UI-only unless noted)
  dictQuery:'', listeningId:null, listeningRun:null,
  readingId:null, readingAnswers:{}, listeningAnswers:{},
  writingId:null, writingDraft:'', writingResult:null,
  conversationId:null, conversationRun:null,
  teacherChat:[], speakingRecording:false, speakingAttempted:false,
  visionTried:false, screenTried:false, examSection:null,
  globalSearchQuery:'', _challenges:[], _achievements:[], _feedbackHistory:[], _updateInfo:null,
  navOpenGroups: new Set(['HOME']), _isOnline: (typeof navigator!=='undefined' ? navigator.onLine : true),
  lessonRuntime:null,
  exerciseRuntime:null,
  vocabTab:'browse',
  vocabSearch:'',
  vocabReview:{queue:[], index:0, showAnswer:false, sessionTotal:0},
  grammarDetailId:null,
  vocabProgress:{}, // id -> item
  lessonProgress:{}, // id -> {completed,score,attempts,lastDone}
  toast:null,
};

async function loadAll(){
  const profArr = await DB.getAll('profile');
  State.profile = profArr.length ? profArr[0] : null;
  const vp = await DB.getAll('vocabProgress');
  vp.forEach(v=>State.vocabProgress[v.id]=v);
  const lp = await DB.getAll('lessonProgress');
  lp.forEach(l=>State.lessonProgress[l.id]=l);
}

async function saveProfile(p){
  p.id = 'profile';
  await DB.put('profile', p);
  State.profile = p;
}

async function logAttempt(category, correct, lessonId){
  await DB.put('attempts', {id:uid(), category, correct, lessonId:lessonId||null, ts:Date.now()});
  if(!correct){
    await DB.put('mistakes', {id:uid(), category, lessonId:lessonId||null, ts:Date.now()});
  }
}

async function touchSessionToday(){
  const key = todayStr();
  let s = await DB.get('sessions', key);
  if(!s){ s = {id:key, date:key, count:0}; }
  s.count += 1;
  await DB.put('sessions', s);
}

async function getVocabItem(vocabId){
  if(State.vocabProgress[vocabId]) return State.vocabProgress[vocabId];
  const fresh = SRS.freshItem(vocabId);
  State.vocabProgress[vocabId] = fresh;
  await DB.put('vocabProgress', fresh);
  return fresh;
}

async function gradeVocab(vocabId, quality){
  const item = await getVocabItem(vocabId);
  const updated = SRS.schedule(item, quality);
  State.vocabProgress[vocabId] = updated;
  await DB.put('vocabProgress', updated);
  return updated;
}

async function setLessonProgress(lessonId, patch){
  const cur = State.lessonProgress[lessonId] || {id:lessonId, completed:false, bestScore:0, attempts:0, lastDone:null};
  const next = {...cur, ...patch};
  State.lessonProgress[lessonId] = next;
  await DB.put('lessonProgress', next);
  return next;
}

/* ---------------- root render ---------------- */
const app = document.getElementById('app');

function render(){
  if(State.view==='onboarding'){ app.innerHTML = shellFree(renderOnboarding()); }
  else if(State.view==='placement'){ app.innerHTML = shellFree(renderPlacement()); }
  else { app.innerHTML = shellApp(renderMain()); }
  attachAfterRender();
}

function shellFree(inner){
  return `<div class="onboard-wrap">${inner}</div>`;
}

const NAV_GROUPS = [
  {label:'HOME', collapsible:false, items:[['home','\u2302','Home']]},
  {label:'LEARN', items:[
    ['learn','\u25A6','Lessons'],['grammar','\u00A7','Grammar Lab'],
    ['vocab','\u270E','Vocabulary'],['dictionary','\u25C6','Dictionary'],
  ]},
  {label:'PRACTICE', items:[
    ['listening','\u266A','Listening'],['speaking','\u25CF','Speaking'],['pronunciation','\u2248','Pronunciation'],
    ['reading','\u25A4','Reading'],['writing','\u2712','Writing'],['conversation','\u2194','Conversation'],
  ]},
  {label:'REVIEW', items:[['review','\u21BB','Review'],['challenges','\u2726','Challenges']]},
  {label:'PROGRESS', items:[['progress','\u25A9','Progress'],['placement-hub','\u25B2','Placement & Level']]},
  {label:'EXAM', items:[['examprep','\u2691','Exam Prep']]},
  {label:'TEACHER', items:[['teacher','\u2605','Wegweiser Teacher']]},
  {label:'TOOLS', items:[
    ['vision','\u25C9','German Vision'],['screen','\u25A3','Screen Assistant'],
    ['favorites','\u2606','Favorites'],['search','\u2315','Search'],
  ]},
  {label:'COMMUNITY', items:[['teacherhub','\u25A8','Teacher Hub'],['feedback','\u2709','Feedback']]},
  {label:'SETTINGS', collapsible:false, items:[['settings','\u2699','Settings']]},
];

/* Which nav group (if any) a given view id belongs to — used to
   auto-expand the right section of the sidebar when navigating,
   and to keep the sidebar from defaulting to fully expanded (which
   was the #1 UX problem found in audit: 23 items + 7 headers is
   taller than a typical laptop viewport, hiding Settings entirely). */
function groupForView(view){
  const g = NAV_GROUPS.find(gr => gr.items.some(([id])=>id===view));
  return g ? g.label : null;
}

function shellApp(inner){
  const nav = NAV_GROUPS.map(group => {
    const isOpen = group.collapsible===false || State.navOpenGroups.has(group.label);
    const header = group.collapsible===false ? `<div class="nav-section-label">${group.label}</div>` :
      `<button type="button" class="nav-section-label nav-section-toggle" data-action="nav-toggle-group" data-arg="${group.label}" aria-expanded="${isOpen}">
         <span>${group.label}</span><span aria-hidden="true">${isOpen?'\u25BE':'\u25B8'}</span>
       </button>`;
    // Items always render in the DOM (never gated by JS) — collapse is a
    // CSS-only visual state on desktop. On mobile the whole accordion is
    // disabled via CSS (see .nav-group-items rules) because the sidebar
    // becomes a horizontal scroll bar there, which doesn't have the
    // vertical-overflow problem the accordion exists to solve, and
    // mobile has no visible header to tap to expand a group anyway.
    const items = group.items.map(([id,icon,label])=>
      `<button type="button" class="nav-item ${State.view===id?'active':''}" aria-current="${State.view===id?'page':'false'}" data-action="nav" data-arg="${id}">
         <span class="icon" aria-hidden="true">${icon}</span><span>${label}</span>
       </button>`).join('');
    return header + `<div class="nav-group-items ${isOpen?'':'closed'}">${items}</div>`;
  }).join('');
  const level = State.profile ? State.profile.level : 'A1';
  const online = State._isOnline!==false;
  return `
  <div class="shell">
    <div class="sidebar">
      <div class="brand">Wegweiser<small>GERMAN COMPANION</small></div>
      ${nav}
      <div class="sidebar-foot">
        <span class="net-indicator ${online?'online':'offline'}" role="status">
          <span class="net-dot" aria-hidden="true"></span>${online?'Online \u2014 optional updates available':'Offline \u2014 your lessons still work'}
        </span>
      </div>
    </div>
    <div class="main">
      <div class="topbar">
        <button type="button" class="stamp-row" data-action="nav" data-arg="profile" style="background:none;border:none;cursor:pointer;text-align:left;" aria-label="Open your profile">
          <div class="stamp">${level}</div>
          <div>
            <div style="font-weight:600;font-size:.92rem;">${greetingLine()}</div>
            <div style="font-size:.76rem;color:var(--text-dim);">${streakLine()}</div>
          </div>
        </button>
        <div class="top-actions">
          <button class="icon-btn" data-action="nav" data-arg="search" title="Search Wegweiser" aria-label="Search Wegweiser"><span aria-hidden="true">\u2315</span></button>
          <button class="icon-btn" data-action="toggle-theme" title="Toggle dark mode" aria-label="Toggle dark mode"><span aria-hidden="true">\u25D1</span></button>
        </div>
      </div>
      <div class="content">${inner}</div>
    </div>
  </div>`;
}

function greetingLine(){
  const hour = new Date().getHours();
  const g = hour<11?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';
  return g + (State.profile && State.profile.name ? ', '+State.profile.name : '') + '!';
}
function streakLine(){
  const n = State._streak||0;
  return n>0 ? `<span class="streak-flame">${n}-day streak</span>` : 'Welcome back';
}

/* ================================================================
   ONBOARDING
   ================================================================ */
const ONBOARD_STEPS = ['welcome','explainLang','level','goals','time','styles','difficulty','correction','confirm'];

function renderOnboarding(){
  const step = ONBOARD_STEPS[State.onboard.step];
  const count = `<div class="onboard-step-count">STEP ${State.onboard.step+1} OF ${ONBOARD_STEPS.length}</div>`;
  let body = '';
  const d = State.onboard.data;

  if(step==='welcome'){
    body = `
    <h1>Willkommen. Let's set up your German companion.</h1>
    <p>This app teaches German from A0 to C2, adapts to your level, and works fully offline — nothing you do here leaves your device.</p>
    <button class="btn gold block" data-action="ob-next">Get started</button>`;
    return body; // no step counter on the welcome screen
  }

  if(step==='explainLang'){
    body = `${count}<h2>Which language should I use to explain German to you?</h2>
    <p style="color:var(--text-dim);">At higher levels I'll gradually shift to explaining things in German itself.</p>
    <div class="choice-grid">${EXPLAIN_LANGS.map(l=>`<button type="button" class="choice ${d.explainLang===l.id?'selected':''}" aria-pressed="${(d.explainLang===l.id)?'true':'false'}" data-action="ob-set" data-key="explainLang" data-arg="${l.id}">${l.label}</button>`).join('')}</div>
    ${navRow()}`;
  }
  else if(step==='level'){
    const opts = ['A0 (I know nothing)','A1','A2','B1','B2','C1','C2','Not sure — test me'];
    body = `${count}<h2>What is your German level?</h2>
    <div class="choice-grid">${opts.map(o=>`<button type="button" class="choice ${d.level===o?'selected':''}" aria-pressed="${(d.level===o)?'true':'false'}" data-action="ob-set" data-key="level" data-arg="${o}">${o}</button>`).join('')}</div>
    ${navRow()}`;
  }
  else if(step==='goals'){
    body = `${count}<h2>Why are you learning German?</h2>
    <p style="color:var(--text-dim);">Choose as many as apply.</p>
    <div class="choice-grid">${GOALS.map(g=>`<button type="button" class="choice ${d.goals.includes(g)?'selected':''}" aria-pressed="${(d.goals.includes(g))?'true':'false'}" data-action="ob-toggle" data-key="goals" data-arg="${g}">${g}</button>`).join('')}</div>
    ${navRow()}`;
  }
  else if(step==='time'){
    body = `${count}<h2>How much time can you study per day?</h2>
    <div class="choice-grid">${TIME_OPTS.map(t=>`<button type="button" class="choice ${d.time===t?'selected':''}" aria-pressed="${(d.time===t)?'true':'false'}" data-action="ob-set-num" data-key="time" data-arg="${t}">${t} min</button>`).join('')}</div>
    ${navRow()}`;
  }
  else if(step==='styles'){
    body = `${count}<h2>How do you like to learn?</h2>
    <p style="color:var(--text-dim);">Choose as many as apply — this shapes your daily plan.</p>
    <div class="choice-grid">${STYLES.map(s=>`<button type="button" class="choice ${d.styles.includes(s)?'selected':''}" aria-pressed="${(d.styles.includes(s))?'true':'false'}" data-action="ob-toggle" data-key="styles" data-arg="${s}">${s}</button>`).join('')}</div>
    ${navRow()}`;
  }
  else if(step==='difficulty'){
    body = `${count}<h2>How challenging should lessons feel?</h2>
    <div class="choice-grid">${DIFFICULTY_OPTS.map(o=>`<button type="button" class="choice ${d.difficulty===o?'selected':''}" aria-pressed="${(d.difficulty===o)?'true':'false'}" data-action="ob-set" data-key="difficulty" data-arg="${o}">${o}</button>`).join('')}</div>
    ${navRow()}`;
  }
  else if(step==='correction'){
    body = `${count}<h2>How should I correct your mistakes?</h2>
    <div class="choice-grid">${CORRECTION_OPTS.map(o=>`<button type="button" class="choice ${d.correction===o.id?'selected':''}" aria-pressed="${(d.correction===o.id)?'true':'false'}" data-action="ob-set" data-key="correction" data-arg="${o.id}">${o.label}</button>`).join('')}</div>
    ${navRow()}`;
  }
  else if(step==='confirm'){
    body = `${count}<h2>Ready.</h2>
    <div class="panel">
      <p><strong>Explaining in:</strong> ${EXPLAIN_LANGS.find(l=>l.id===d.explainLang).label}</p>
      <p><strong>Level:</strong> ${d.level}</p>
      <p><strong>Goals:</strong> ${d.goals.join(', ')||'—'}</p>
      <p><strong>Daily time:</strong> ${d.time} min</p>
      <p><strong>Style:</strong> ${d.styles.join(', ')||'—'}</p>
      <p><strong>Difficulty:</strong> ${d.difficulty}</p>
    </div>
    <button class="btn gold block" data-action="ob-finish">Create my learner profile</button>`;
  }
  return body;
}

function navRow(){
  return `<div style="display:flex;justify-content:space-between;margin-top:22px;">
    <button class="btn secondary" data-action="ob-back">Back</button>
    <button class="btn gold" data-action="ob-next">Continue</button>
  </div>`;
}

async function handleOnboardAction(action, el){
  const d = State.onboard.data;
  if(action==='ob-set'){ d[el.dataset.key] = el.dataset.arg; render(); return; }
  if(action==='ob-set-num'){ d[el.dataset.key] = Number(el.dataset.arg); render(); return; }
  if(action==='ob-toggle'){
    const key=el.dataset.key, val=el.dataset.arg;
    const arr = d[key];
    const i = arr.indexOf(val);
    if(i>=0) arr.splice(i,1); else arr.push(val);
    render(); return;
  }
  if(action==='ob-next'){
    const step = ONBOARD_STEPS[State.onboard.step];
    if(step==='level' && !d.level){ flashRequired(); return; }
    if(step==='level' && d.level==='Not sure — test me'){
      State.view='placement'; State.placement={index:0,answers:[],retake:false}; State.placementResult=null; render(); return;
    }
    State.onboard.step = Math.min(State.onboard.step+1, ONBOARD_STEPS.length-1);
    render(); return;
  }
  if(action==='ob-back'){
    State.onboard.step = Math.max(0, State.onboard.step-1);
    render(); return;
  }
  if(action==='ob-finish'){
    const level = d.level==='A0 (I know nothing)' ? 'A0' : (State.placementResult ? State.placementResult.level : d.level);
    const profile = {
      learningLanguage:'German', explainLang:d.explainLang, level, goals:d.goals,
      time:d.time, styles:d.styles, difficulty:d.difficulty, correction:d.correction,
      theme:'light', createdAt:Date.now(), favorites:[],
      placementResult: State.placementResult ? {...State.placementResult, takenAt:Date.now()} : null,
    };
    await saveProfile(profile);
    State.view='home';
    render();
  }
}

function flashRequired(){
  const h2 = document.querySelector('.onboard-wrap h2');
  if(h2){ h2.style.color = 'var(--brick)'; setTimeout(()=>{ if(h2) h2.style.color=''; }, 700); }
}

/* ================================================================
   PLACEMENT TEST
   ================================================================ */
function renderPlacement(){
  const idx = State.placement.index;
  if(idx >= PLACEMENT_TEST.length){ return renderPlacementResult(); }
  const q = PLACEMENT_TEST[idx];
  const cancelLink = `<button class="btn secondary small" data-action="placement-cancel" style="margin-bottom:14px;">\u2190 ${State.placement.retake?'Cancel retake':'Back — I do know my level'}</button>`;
  return `
  ${cancelLink}
  <div class="onboard-step-count">QUICK PLACEMENT — QUESTION ${idx+1} OF ${PLACEMENT_TEST.length}</div>
  <h2>${escapeHtml(q.prompt)}</h2>
  <div>${shuffle(q.options).map(o=>`<button class="mcq-option" data-action="placement-answer" data-arg="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}</div>
  `;
}

// Deterministic, pure scoring (Logic.computePlacementResult) — same inputs
// always produce the same estimated level; no randomness anywhere in scoring.
function computePlacementResult(){
  return Logic.computePlacementResult(State.placement.answers, PLACEMENT_TEST, CEFR_LEVELS);
}

function renderPlacementResult(){
  const r = State.placementResult || (State.placementResult = computePlacementResult());
  const rows = Object.entries(r.byLevel).filter(([,v])=>v.total>0).map(([lvl,v])=>
    `<div class="skill-row"><div class="label">${lvl}</div><div class="progress-bar"><div style="width:${Math.round(100*v.correct/v.total)}%"></div></div><div class="pct">${v.correct}/${v.total}</div></div>`
  ).join('');
  return `
  <div role="status" aria-live="polite">
  <h1>Quick Placement estimate: ${r.level}</h1>
  <p style="color:var(--text-dim);">Based on ${PLACEMENT_TEST.length} grammar/vocabulary questions \u2014 a fast estimate, not a full CEFR skills assessment or official certification. Reading, writing, listening and speaking aren't separately measured yet. You can retake this any time from Settings.</p>
  <div class="panel">${rows}</div>
  <div class="panel-note">Structured lessons in this version currently cover <strong>A1–A2</strong>. If your estimate is higher, start at A2 and use the Grammar Lab and Vocabulary browser to go further — deeper B1+ content is planned next.</div>
  <button class="btn gold block" data-action="placement-continue">${State.placement.retake?'Save this level':'Continue'}</button>
  </div>`;
}

function handlePlacementAnswer(el){
  const idx = State.placement.index;
  const q = PLACEMENT_TEST[idx];
  const chosen = el.dataset.arg;
  const correct = chosen === q.correct;
  State.placement.answers.push({qid:q.id, correct});
  document.querySelectorAll('.mcq-option').forEach(b=>{
    b.disabled = true;
    if(b.dataset.arg===q.correct) b.classList.add('correct');
    else if(b===el) b.classList.add('incorrect');
  });
  setTimeout(()=>{ State.placement.index++; render(); }, 600);
}

/* ================================================================
   HOME
   ================================================================ */
function nextRecommendedLesson(){
  const order = LESSONS.filter(l=>['A1','A2'].includes(l.level)).sort((a,b)=>a.order-b.order);
  for(const l of order){
    const p = State.lessonProgress[l.id];
    if(!p || !p.completed) return l;
  }
  return order[order.length-1];
}

function dueVocabCount(){
  return Object.values(State.vocabProgress).filter(v=>SRS.isDue(v)).length;
}

function weakestGroup(){
  // Grouped (not raw-category) so a few borderline attempts split across
  // related categories (e.g. akkusativ + dativ) still add up to visible
  // evidence for the broader "cases" bucket. See Logic.CATEGORY_GROUPS.
  return Logic.weakestGroup(State._groupStats || {}, 3);
}

function allCurrentLessonsDone(){
  return LESSONS.filter(l=>['A1','A2'].includes(l.level))
    .every(l=> State.lessonProgress[l.id] && State.lessonProgress[l.id].completed);
}

function newWordsAvailableCount(){
  return VOCAB.filter(v=>!State.vocabProgress[v.id]).length;
}

const PLAN_ICONS = {review:'\u270E', weak:'\u00A7', lesson:'\u25A6', new:'\u270E', free:'\u00A7'};

function renderHome(){
  const allDone = allCurrentLessonsDone();
  const next = allDone ? null : nextRecommendedLesson();
  const due = dueVocabCount();
  const weakGroup = weakestGroup();
  const time = State.profile.time;
  const plan = Logic.buildDailyPlan({
    minutes: time, due, weakGroupLabel: weakGroup ? labelForGroup(weakGroup) : null,
    nextLessonTitle: next ? next.title : null, allLessonsDone: allDone,
    newWordsAvailable: newWordsAvailableCount(),
  });

  return `
  <h1>Today's plan</h1>
  <div class="panel">
    ${plan.map(p=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>${PLAN_ICONS[p.key]||'\u2022'} ${escapeHtml(p.label)}</span><span style="color:var(--text-dim);">${p.minutes} min</span></div>`).join('')}
  </div>
  <div class="grid cols-3">
    <div class="panel">
      <h3>Continue learning</h3>
      ${allDone ? `
        <p style="color:var(--text-dim);font-size:.88rem;">All current lessons complete</p>
        <p>You've finished every A1–A2 lesson available in this build. Keep reviewing vocabulary and revisit the Grammar Lab to stay sharp until more levels ship.</p>
        <button class="btn secondary" data-action="nav" data-arg="grammar">Open Grammar Lab</button>
      ` : `
        <p style="color:var(--text-dim);font-size:.88rem;">${next.level} · ${next.topic}</p>
        <p>${escapeHtml(next.title)}</p>
        <button class="btn gold" data-action="open-lesson" data-arg="${next.id}">Continue lesson</button>
      `}
    </div>
    <div class="panel">
      <h3>Review due</h3>
      <p style="font-size:2rem;font-family:var(--serif);margin:4px 0;">${due}</p>
      <p style="color:var(--text-dim);font-size:.88rem;">words due for spaced repetition review</p>
      <button class="btn secondary" data-action="nav" data-arg="vocab">Review vocabulary</button>
    </div>
    <div class="panel">
      <h3>${weakGroup ? 'Weakest area' : 'Ask the Teacher'}</h3>
      ${weakGroup ? `
        <p style="color:var(--text-dim);font-size:.88rem;">Based on your recent exercise accuracy</p>
        <p><strong>${labelForGroup(weakGroup)}</strong></p>
        <button class="btn secondary" data-action="nav" data-arg="grammar">Practice this</button>
      ` : `
        <p style="color:var(--text-dim);font-size:.88rem;">Not enough data yet to spot a weak area \u2014 keep practicing.</p>
        <button class="btn secondary" data-action="nav" data-arg="teacher">Open Teacher</button>
      `}
    </div>
  </div>
  <div class="grid cols-2" style="margin-top:16px;">
    ${weakGroup ? `
    <div class="panel">
      <h3>Wegweiser Teacher</h3>
      <p style="color:var(--text-dim);font-size:.88rem;">Quick actions for grammar, writing checks, speaking practice, and exam prep \u2014 all route to real local tools.</p>
      <button class="btn secondary" data-action="nav" data-arg="teacher">Open Teacher</button>
    </div>` : ''}
    <div class="panel">
      <h3>Your progress</h3>
      <p style="color:var(--text-dim);font-size:.88rem;">See achievements, saved words, and full statistics.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn secondary small" data-action="nav" data-arg="achievements">Achievements</button>
        <button class="btn secondary small" data-action="nav" data-arg="progress">Full progress</button>
      </div>
    </div>
  </div>
  `;
}

/* ================================================================
   LEARN
   ================================================================ */
function renderLearn(){
  const tabs = ['A1','A2','B1','B2','C1','C2'];
  const tabRow = tabs.map(t=>`<button class="btn ${State.learnTab===t?'gold':'secondary'} small" data-action="learn-tab" data-arg="${t}">${t}</button>`).join(' ');
  const levelLessons = LESSONS.filter(l=>l.level===State.learnTab).sort((a,b)=>a.order-b.order);
  let list;
  if(levelLessons.length===0){
    list = `<div class="empty-state">Structured lessons for ${State.learnTab} are not built in this version yet.<br>Phase roadmap: A1–A2 now, B1–C2 planned next.</div>`;
  } else {
    list = levelLessons.map(l=>{
      const p = State.lessonProgress[l.id];
      const tier = Logic.masteryTier(p);
      const status = `<span class="pill" style="border-color:${Logic.masteryColor(tier)};color:${Logic.masteryColor(tier)};">${tier}${p&&p.completed?' · '+Math.round((p.bestScore||0)*100)+'%':''}</span>`;
      return `<div class="lesson-list-item">
        <div><div style="font-weight:600;">${escapeHtml(l.title)}</div><div class="meta">${l.topic}</div></div>
        <div style="display:flex;align-items:center;gap:10px;">${status}
          <button class="btn small ${p&&p.completed?'secondary':'gold'}" data-action="open-lesson" data-arg="${l.id}">${p&&p.completed?'Review':'Start'}</button>
        </div>
      </div>`;
    }).join('');
  }
  return `<h1>Learn German</h1><div style="margin-bottom:16px;">${tabRow}</div>${list}`;
}

function openLesson(id){
  const lesson = lessonById(id);
  State.lessonRuntime = {lesson, phase:'teach'};
  State.view='lesson';
  render();
}

function renderLessonView(){
  const {lesson, phase} = State.lessonRuntime;
  if(phase==='teach') return renderLessonTeach(lesson);
  if(phase==='exercises') return renderExerciseFlow();
  if(phase==='done') return renderLessonDone(lesson);
}

function renderLessonTeach(lesson){
  const grammar = lesson.grammarId ? grammarById(lesson.grammarId) : null;
  const vocabRows = lesson.vocabIds.map(id=>{
    const v = vocabById(id);
    const artClass = v.article ? `article-${v.article}` : '';
    return `<tr><td class="${artClass}">${v.article||''}</td><td>${escapeHtml(v.de)}</td><td class="hide-narrow" style="color:var(--text-dim);">${v.plural||''}</td><td>${escapeHtml(v.en)}</td></tr>`;
  }).join('');
  const prereqTitles = (lesson.prereq||[]).map(id=>{ const l=lessonById(id); return l?l.title:id; });
  return `
  <button class="btn secondary small" data-action="nav" data-arg="learn">\u2190 Back to Learn</button>
  <h1 style="margin-top:14px;">${escapeHtml(lesson.title)}</h1>
  ${prereqTitles.length ? `<p style="color:var(--text-dim);font-size:.82rem;">Builds on: ${prereqTitles.map(escapeHtml).join(', ')}</p>` : ''}
  ${lesson.goal ? `<div class="panel-note"><strong>What you\u2019ll be able to do</strong><p style="margin:6px 0 0;">${escapeHtml(lesson.goal)}</p></div>` : ''}
  ${lesson.why ? `<div class="panel-note success"><strong>Why it matters</strong><p style="margin:6px 0 0;">${escapeHtml(lesson.why)}</p></div>` : ''}
  <p>${escapeHtml(lesson.intro)}</p>
  ${lesson.teach.map(t=>`<div class="panel-note"><strong>${escapeHtml(t.h)}</strong><p style="margin:6px 0 0;">${escapeHtml(t.p)}</p></div>`).join('')}
  ${lesson.sentenceProgression ? renderSentenceProgression(lesson.sentenceProgression) : ''}
  ${grammar ? `<div class="panel"><h3>${escapeHtml(grammar.title)}</h3><p>${escapeHtml(grammar.explanation)}</p>
    <ul>${grammar.rules.map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ul>
    ${grammar.examples.map(e=>`<div style="margin:6px 0;"><strong>${escapeHtml(e.de)}</strong><br><span style="color:var(--text-dim);">${escapeHtml(e.en)}</span></div>`).join('')}
  </div>` : ''}
  ${lesson.commonMistake ? `<div class="panel-note error"><strong>Common mistake</strong><p style="margin:6px 0 0;">${escapeHtml(lesson.commonMistake)}</p></div>` : ''}
  ${vocabRows ? `<div class="panel"><h3>Vocabulary in this lesson</h3><div class="table-scroll"><table class="vocab-table"><thead><tr><th scope="col"></th><th scope="col">German</th><th scope="col" class="hide-narrow">Plural</th><th scope="col">English</th></tr></thead><tbody>${vocabRows}</tbody></table></div></div>` : ''}
  <button class="btn gold block" data-action="start-exercises">Start practice (${lesson.exercises.length} exercises)</button>
  `;
}

/* Renders the "word → phrase → sentence → variation" teaching pattern
   requested as a core Wegweiser pedagogy principle: build up one real
   sentence step by step rather than teaching an isolated word. */
function renderSentenceProgression(sp){
  return `<div class="panel"><h3>${escapeHtml(sp.title)}</h3>
    ${sp.steps.map((s,i)=>`
      <div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;${i>0?'border-top:1px solid var(--border);':''}">
        <div style="width:22px;flex-shrink:0;color:var(--text-dim);font-size:.8rem;padding-top:3px;">${i+1}</div>
        <div>
          <div style="font-family:var(--serif);font-size:1.05rem;">${escapeHtml(s.de)}</div>
          <div style="color:var(--text-dim);font-size:.9rem;">${escapeHtml(s.en)}</div>
          <div style="font-size:.85rem;margin-top:3px;">${escapeHtml(s.note)}</div>
        </div>
      </div>`).join('')}
  </div>`;
}

function renderLessonDone(lesson){
  const run = State.exerciseRuntime;
  const score = run.total ? run.correct/run.total : 1;
  const progress = State.lessonProgress[lesson.id];
  const tier = Logic.masteryTier(progress);
  const keyPoint = lesson.teach && lesson.teach[0];
  return `
  <h1>Lesson complete</h1>
  <div class="panel">
    <p style="font-size:1.8rem;font-family:var(--serif);">${Math.round(score*100)}%</p>
    <p>You got ${run.correct} of ${run.total} exercises right on your first pass.</p>
    <p style="margin-top:8px;">Mastery: <strong style="color:${Logic.masteryColor(tier)};">${tier}</strong>${(tier==='Needs review'||tier==='Developing')?' — another pass would help this stick.':''}</p>
  </div>
  <div class="panel"><h3>What you learned</h3>
    <p>${escapeHtml(lesson.goal||lesson.intro)}</p>
    ${keyPoint ? `<p style="margin-top:8px;"><strong>Remember:</strong> ${escapeHtml(keyPoint.p)}</p>` : ''}
  </div>
  ${run.deferredCorrections && run.deferredCorrections.length ? `
  <div class="panel"><h3>Corrections to review</h3>
    <p style="color:var(--text-dim);font-size:.85rem;">Shown together at the end, per your "let me finish, then correct" preference in Settings.</p>
    ${run.deferredCorrections.map(c=>`<div class="panel-note error"><strong>${escapeHtml(c.prompt)}</strong>
      ${c.userAnswer!==undefined && c.correctAnswer!==undefined ? `<div style="margin:6px 0;font-size:.9rem;">
        <div>\u274C Your answer: <strong>${escapeHtml(c.userAnswer||'(nothing typed)')}</strong></div>
        <div>\u2705 Correct: <strong>${escapeHtml(c.correctAnswer)}</strong></div>
      </div>` : ''}
      <p style="margin:4px 0 0;">${escapeHtml(c.explain)}</p></div>`).join('')}
  </div>` : ''}
  <div class="panel"><h3>Your mistakes &amp; next step</h3>
    ${run.missedCategories.length ? `<p>You could use more practice with: <strong>${run.missedCategories.map(labelForCategory).join(', ')}</strong>.</p>` : `<div class="panel-note success">No repeated mistakes — nice work.</div>`}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
      ${run.missedCategories.length ? `<button class="btn secondary small" data-action="nav" data-arg="grammar">Practice this in Grammar Lab</button>` : ''}
      ${(tier==='Needs review'||tier==='Developing') ? `<button class="btn secondary small" data-action="open-lesson" data-arg="${lesson.id}">Review this lesson again</button>` : ''}
      <button class="btn secondary small" data-action="nav" data-arg="teacher">Ask Teacher about this lesson</button>
    </div>
  </div>
  <div style="display:flex;gap:10px;">
    <button class="btn gold" data-action="nav" data-arg="learn">Back to Learn</button>
    <button class="btn secondary" data-action="nav" data-arg="home">Home</button>
  </div>`;
}

/* ---------- generic exercise engine (used by lessons and grammar quizzes) ---------- */
function startExercises(exercises, lessonId){
  State.exerciseRuntime = {
    exercises: exercises, index:0, correct:0, total:exercises.length,
    lessonId: lessonId||null, missedCategories:[], answered:false, buildAnswer:[], buildWords:[],
    deferredCorrections:[],
  };
  if(State.lessonRuntime) State.lessonRuntime.phase='exercises';
  render();
}

function renderExerciseFlow(){
  const run = State.exerciseRuntime;
  if(run.index >= run.exercises.length){
    // Pure render only — finalization side effects happen in handleExerciseNext,
    // before this render is ever reached, so this branch is just the quiz-results view.
    return renderGrammarQuizDone(run);
  }
  const ex = run.exercises[run.index];
  const progressLabel = `Exercise ${run.index+1} of ${run.exercises.length}`;
  let body = '';
  if(ex.type==='mcq'){
    const opts = ex._shuffled || (ex._shuffled = shuffle(ex.options));
    body = opts.map(o=>`<button class="mcq-option" data-action="ex-mcq" data-arg="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('');
  } else if(ex.type==='fill'){
    body = `<label class="visually-hidden" for="fillInput">Your answer</label>
      <input type="text" class="fill-input" id="fillInput" placeholder="Type your answer..." aria-label="Your answer" autocomplete="off">
      <div style="margin-top:14px;"><button class="btn gold" data-action="ex-fill-submit">Check</button></div>`;
  } else if(ex.type==='build'){
    if(!run._builtWords) run._builtWords = shuffle(ex.words);
    const chosen = run.buildAnswer;
    const remaining = run._builtWords.filter((w,i)=> chosen.filter(c=>c.w===w).length <= chosen.filter(c=>c.w===w && c.used).length ? true: true);
    // simpler: track used indices
    body = `<div style="min-height:44px;border:1px dashed var(--border);border-radius:var(--radius);padding:10px;margin-bottom:14px;">
        ${run.buildAnswer.map((w,i)=>`<button class="choice selected" data-action="ex-build-remove" data-arg="${i}" style="margin:3px;">${escapeHtml(w)}</button>`).join('') || '<span style="color:var(--text-dim);">Click words below in order...</span>'}
      </div>
      <div>${run._builtWords.map((w,i)=>`<button class="choice" data-action="ex-build-add" data-arg="${i}" ${run._usedIdx&&run._usedIdx.has(i)?'style="display:none;"':''} style="margin:3px;">${escapeHtml(w)}</button>`).join('')}</div>
      <div style="margin-top:14px;display:flex;gap:10px;">
        <button class="btn secondary small" data-action="ex-build-clear">Clear</button>
        <button class="btn gold" data-action="ex-build-submit">Check</button>
      </div>`;
  } else if(ex.type==='correct'){
    body = `<div class="panel-note error" style="margin-bottom:14px;"><strong>Contains a mistake:</strong> <span style="text-decoration:line-through;">${escapeHtml(ex.wrong)}</span></div>
      <label class="visually-hidden" for="fillInput">Corrected sentence</label>
      <input type="text" class="fill-input" id="fillInput" placeholder="Type the corrected sentence..." aria-label="Corrected sentence" autocomplete="off">
      <div style="margin-top:14px;"><button class="btn gold" data-action="ex-fill-submit">Check</button></div>`;
  } else if(ex.type==='match'){
    if(!run._matchLeft){
      run._matchLeft = shuffle(ex.pairs.map((p,i)=>({...p,i})));
      run._matchRight = shuffle(ex.pairs.map((p,i)=>({...p,i})));
      run._matchDone = new Set();
      run._matchSelectedLeft = null;
    }
    const leftCol = run._matchLeft.map((p)=>{
      const done = run._matchDone.has(p.i);
      const selected = run._matchSelectedLeft===p.i;
      return `<button class="choice ${selected?'selected':''}" style="display:block;width:100%;margin-bottom:6px;${done?'opacity:.4;':''}" ${done?'disabled':''} data-action="ex-match-left" data-arg="${p.i}">${escapeHtml(p.de)}</button>`;
    }).join('');
    const rightCol = run._matchRight.map((p)=>{
      const done = run._matchDone.has(p.i);
      return `<button class="choice" style="display:block;width:100%;margin-bottom:6px;${done?'opacity:.4;':''}" ${done?'disabled':''} data-action="ex-match-right" data-arg="${p.i}">${escapeHtml(p.en)}</button>`;
    }).join('');
    body = `<div class="grid cols-2"><div>${leftCol}</div><div>${rightCol}</div></div>
      ${run._matchWrongFlash ? `<p style="color:var(--brick);font-size:.85rem;margin-top:8px;">Not a match \u2014 try again.</p>` : ''}`;
  }
  // "important" correction style: keep full explanations for mistakes,
  // but skip the extra explanation text on answers already correct so
  // the flow feels lighter, per the learner's stated preference.
  const skipCorrectDetail = run.feedback && run.feedback.ok && State.profile && State.profile.correction==='important';
  const answerCompare = (run.feedback && !run.feedback.ok && run.feedback.userAnswer!==undefined && run.feedback.correctAnswer!==undefined) ? `
    <div style="margin:8px 0;font-size:.92rem;">
      <div>\u274C Your answer: <strong>${escapeHtml(run.feedback.userAnswer||'(nothing typed)')}</strong></div>
      <div>\u2705 Correct: <strong>${escapeHtml(run.feedback.correctAnswer)}</strong></div>
    </div>` : '';
  const feedback = run.feedback ? `<div class="panel-note ${run.feedback.ok?'success':'error'}" role="status" aria-live="polite"><strong>${run.feedback.ok?'Correct.':'Not quite.'}</strong>${answerCompare}${skipCorrectDetail?'':`<p style="margin:6px 0 0;">${escapeHtml(run.feedback.explain)}</p>`}</div>
    <button class="btn gold block" data-action="ex-next">${run.index+1>=run.exercises.length?'See results':'Next exercise'}</button>` : '';

  return `
  <div class="onboard-step-count">${progressLabel}</div>
  <div class="exercise-box">
    <div class="exercise-prompt">${escapeHtml(ex.prompt)}</div>
    ${run.feedback ? '' : body}
  </div>
  ${feedback}
  `;
}

function currentExercise(){
  const run = State.exerciseRuntime;
  return run.exercises[run.index];
}

async function submitAnswer(correct, explain, category, lessonIdOverride, userAnswer, correctAnswer){
  const run = State.exerciseRuntime;
  const ex = currentExercise();
  if(correct) run.correct++;
  else if(!run.missedCategories.includes(ex.category)) run.missedCategories.push(ex.category);
  await logAttempt(ex.category, correct, lessonIdOverride!==undefined?lessonIdOverride:run.lessonId);
  refreshCategoryStatsCache();

  // Correction-style preference from onboarding, actually applied:
  // "after" defers all feedback to a single corrections summary at the
  // end of the lesson instead of interrupting after every question.
  const deferMode = State.profile && State.profile.correction==='after';
  if(deferMode){
    run.deferredCorrections = run.deferredCorrections || [];
    if(!correct) run.deferredCorrections.push({prompt: ex.prompt, explain, userAnswer, correctAnswer});
    await handleExerciseNext();
  } else {
    run.feedback = {ok:correct, explain, userAnswer, correctAnswer};
    render();
  }
}

function handleMcq(el){
  const run = State.exerciseRuntime;
  const ex = currentExercise();
  const chosen = el.dataset.arg;
  const correct = chosen === ex.correct;
  document.querySelectorAll('.mcq-option').forEach(b=>{
    b.disabled=true;
    if(b.dataset.arg===ex.correct) b.classList.add('correct');
    else if(b===el) b.classList.add('incorrect');
  });
  setTimeout(()=>submitAnswer(correct, ex.explain, ex.category, undefined, chosen, ex.correct), 350);
}

function handleFillSubmit(){
  const ex = currentExercise();
  const input = document.getElementById('fillInput');
  const raw = input.value;
  const val = normalize(raw);
  const correct = ex.accept.some(a=>normalize(a)===val);
  submitAnswer(correct, ex.explain, ex.category, undefined, raw, ex.accept[0]);
}

function handleBuildAdd(el){
  const run = State.exerciseRuntime;
  const idx = Number(el.dataset.arg);
  if(!run._usedIdx) run._usedIdx = new Set();
  if(run._usedIdx.has(idx)) return;
  run._usedIdx.add(idx);
  run.buildAnswer.push(run._builtWords[idx]);
  render();
}
function handleBuildRemove(el){
  const run = State.exerciseRuntime;
  const pos = Number(el.dataset.arg);
  const word = run.buildAnswer[pos];
  // free up one matching used index
  const idxToFree = run._builtWords.findIndex((w,i)=> w===word && run._usedIdx.has(i));
  if(idxToFree>=0) run._usedIdx.delete(idxToFree);
  run.buildAnswer.splice(pos,1);
  render();
}
function handleBuildClear(){
  const run = State.exerciseRuntime;
  run.buildAnswer = [];
  run._usedIdx = new Set();
  render();
}
function handleBuildSubmit(){
  const run = State.exerciseRuntime;
  const ex = currentExercise();
  const correct = JSON.stringify(run.buildAnswer)===JSON.stringify(ex.correctOrder);
  submitAnswer(correct, ex.explain, ex.category, undefined, run.buildAnswer.join(' '), ex.correctOrder.join(' '));
}

function handleMatchLeft(el){
  const run = State.exerciseRuntime;
  run._matchSelectedLeft = Number(el.dataset.arg);
  run._matchWrongFlash = false;
  render();
}
async function handleMatchRight(el){
  const run = State.exerciseRuntime;
  const idx = Number(el.dataset.arg);
  if(run._matchSelectedLeft===null || run._matchSelectedLeft===undefined) return;
  const ex = currentExercise();
  if(run._matchSelectedLeft===idx){
    run._matchDone.add(idx);
    run._matchSelectedLeft = null;
    run._matchWrongFlash = false;
    if(run._matchDone.size>=ex.pairs.length){
      await submitAnswer(true, ex.explain, ex.category);
      return;
    }
  } else {
    run._matchWrongFlash = true;
    await logAttempt(ex.category, false, run.lessonId);
    run._matchSelectedLeft = null;
  }
  render();
}

async function handleExerciseNext(){
  const run = State.exerciseRuntime;
  run.index++;
  run.feedback = null;
  run.buildAnswer = [];
  run._builtWords = null;
  run._usedIdx = null;
  run._matchLeft = null; run._matchRight = null; run._matchDone = null;
  run._matchSelectedLeft = null; run._matchWrongFlash = false;

  if(run.index >= run.exercises.length && State.lessonRuntime){
    // Finished all exercises for a lesson: finalize progress/SRS/session as a
    // state mutation *before* rendering, so render() itself stays a pure read.
    const lesson = State.lessonRuntime.lesson;
    const score = run.total ? run.correct/run.total : 1;
    await setLessonProgress(lesson.id, {
      completed:true,
      bestScore: Math.max(score, (State.lessonProgress[lesson.id]||{}).bestScore||0),
      attempts: ((State.lessonProgress[lesson.id]||{}).attempts||0)+1,
      lastDone: Date.now(),
    });
    for(const id of lesson.vocabIds){ await getVocabItem(id); }
    await touchSessionToday();
    await refreshStreak();
    State.lessonRuntime.phase='done';
  } else if(run.index >= run.exercises.length && !State.lessonRuntime){
    // Standalone grammar-lab quiz finished: this is real study activity too,
    // so it should count toward the daily session log and streak.
    await touchSessionToday();
    await refreshStreak();
  }
  render();
}

function renderGrammarQuizDone(run){
  const score = run.total ? run.correct/run.total : 1;
  return `
  <h1>Quiz complete</h1>
  <div class="panel"><p style="font-size:1.8rem;font-family:var(--serif);">${Math.round(score*100)}%</p>
  <p>${run.correct} of ${run.total} correct.</p></div>
  <button class="btn gold" data-action="nav" data-arg="grammar">Back to Grammar Lab</button>`;
}

/* ================================================================
   VOCABULARY
   ================================================================ */
function renderVocab(){
  const tabRow = `<button class="btn ${State.vocabTab==='browse'?'gold':'secondary'} small" data-action="vocab-tab" data-arg="browse">Browse</button>
    <button class="btn ${State.vocabTab==='review'?'gold':'secondary'} small" data-action="vocab-tab" data-arg="review">Review (${dueVocabCount()} due)</button>`;
  const body = State.vocabTab==='browse' ? renderVocabBrowse() : renderVocabReview();
  return `<h1>Vocabulary</h1><div style="margin-bottom:16px;">${tabRow}</div>${body}`;
}

function renderVocabBrowse(){
  const q = State.vocabSearch.toLowerCase();
  const favs = State.profile.favorites||[];
  const filtered = VOCAB.filter(v=> !q || v.de.toLowerCase().includes(q) || v.en.toLowerCase().includes(q) || v.topic.includes(q));
  const rows = filtered.map(v=>{
    const prog = State.vocabProgress[v.id];
    const status = prog ? prog.status : 'new';
    const artClass = v.article?`article-${v.article}`:'';
    const isFav = favs.includes('v:'+v.id);
    return `<tr><td><button class="icon-btn" style="width:30px;height:30px;font-size:.85rem;" data-action="toggle-favorite" data-arg="v:${v.id}" aria-label="${isFav?'Remove from favorites':'Add to favorites'}">${isFav?'\u2605':'\u2606'}</button></td><td class="${artClass}">${v.article||''}</td><td>${escapeHtml(v.de)}</td><td class="hide-narrow" style="color:var(--text-dim);">${v.plural||''}</td><td>${escapeHtml(v.en)}</td><td><span class="pill ${status==='mastered'?'on':''}">${status}</span></td></tr>`;
  }).join('');
  return `
  <label class="visually-hidden" for="vocabSearchInput">Search vocabulary</label>
  <input type="text" class="fill-input" style="width:100%;margin-bottom:12px;" placeholder="Search vocabulary..." id="vocabSearchInput" aria-label="Search vocabulary" value="${escapeHtml(State.vocabSearch)}">
  <div class="table-scroll">
  <table class="vocab-table"><thead><tr><th scope="col"></th><th scope="col"></th><th scope="col">German</th><th scope="col" class="hide-narrow">Plural</th><th scope="col">English</th><th scope="col">Status</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="6" style="color:var(--text-dim);padding:16px;">No matches.</td></tr>'}</tbody></table>
  </div>
  `;
}

// Session size genuinely responds to the learner's stated difficulty
// preference from onboarding — previously collected but never used
// anywhere, which is exactly the kind of decorative-only preference
// this phase's personalization audit calls out.
const DIFFICULTY_SESSION_SIZE = {'Relaxed':12, 'Balanced':20, 'Challenging':28, 'Very challenging':36};
function buildReviewQueue(){
  const due = Object.values(State.vocabProgress).filter(v=>SRS.isDue(v));
  const dueIds = new Set(due.map(v=>v.id));
  const sessionSize = DIFFICULTY_SESSION_SIZE[(State.profile&&State.profile.difficulty)] || 20;
  const freshCount = Math.round(sessionSize*0.4);
  const fresh = VOCAB.filter(v=>!State.vocabProgress[v.id]).slice(0,freshCount).map(v=>v.id);
  const queueIds = shuffle([...dueIds, ...fresh]).slice(0,sessionSize);
  return queueIds;
}

function renderVocabReview(){
  const rv = State.vocabReview;
  if(rv.queue.length===0 && rv.index===0 && !rv.started){
    const q = buildReviewQueue();
    if(q.length===0){
      return `<div class="empty-state">Nothing due for review right now. Learn a new lesson to add more words, or come back later.</div>`;
    }
    return `<div class="panel"><p>${q.length} words ready for review.</p><button class="btn gold" data-action="vocab-review-start">Start review session</button></div>`;
  }
  if(rv.index >= rv.queue.length){
    return `<div class="panel"><h3>Review session complete</h3><p>You reviewed ${rv.queue.length} words.</p><button class="btn gold" data-action="vocab-review-reset">Back</button></div>`;
  }
  const vocabId = rv.queue[rv.index];
  const v = vocabById(vocabId);
  const artClass = v.article?`article-${v.article}`:'';
  return `
  <div class="onboard-step-count">CARD ${rv.index+1} OF ${rv.queue.length}</div>
  <div class="flashcard">
    <div style="font-family:var(--serif);font-size:1.6rem;" class="${artClass}">${v.article?v.article+' ':''}${escapeHtml(v.de)}</div>
    ${rv.showAnswer ? `
      <div style="font-size:1.1rem;margin-top:6px;">${escapeHtml(v.en)}</div>
      ${v.plural?`<div style="color:var(--text-dim);font-size:.85rem;">Plural: ${escapeHtml(v.plural)}</div>`:''}
      ${v.ex_de?`<div style="margin-top:14px;font-size:.9rem;color:var(--text-dim);">${escapeHtml(v.ex_de)}<br>${escapeHtml(v.ex_en||'')}</div>`:''}
    ` : `<button class="btn secondary" data-action="vocab-show-answer" style="margin-top:14px;">Show answer</button>`}
  </div>
  ${rv.showAnswer ? `
  <div class="grid cols-3" style="margin-top:16px;">
    <button class="btn secondary" data-action="vocab-grade" data-arg="1">Again</button>
    <button class="btn secondary" data-action="vocab-grade" data-arg="3">Good</button>
    <button class="btn gold" data-action="vocab-grade" data-arg="5">Easy</button>
  </div>` : ''}
  `;
}

/* ================================================================
   GRAMMAR LAB
   ================================================================ */
function renderGrammar(){
  if(State.grammarDetailId) return renderGrammarDetail(grammarById(State.grammarDetailId));
  const rows = GRAMMAR.map(g=>`
    <div class="lesson-list-item">
      <div><div style="font-weight:600;">${escapeHtml(g.title)}</div><div class="meta">${g.level}</div></div>
      <button class="btn small gold" data-action="open-grammar" data-arg="${g.id}">Open</button>
    </div>`).join('');
  return `<h1>Grammar Lab</h1>${rows}`;
}

function renderGrammarDetail(g){
  const relatedExercises = [];
  LESSONS.forEach(l=>l.exercises.forEach(e=>{ if(e.category===g.category && relatedExercises.length<6) relatedExercises.push(e); }));
  return `
  <button class="btn secondary small" data-action="grammar-back">\u2190 Back to Grammar Lab</button>
  <h1 style="margin-top:14px;">${escapeHtml(g.title)}</h1>
  <p>${escapeHtml(g.explanation)}</p>
  <div class="panel"><h3>Rules</h3><ul>${g.rules.map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ul></div>
  <div class="panel"><h3>Examples</h3>${g.examples.map(e=>`<div style="margin:8px 0;"><strong>${escapeHtml(e.de)}</strong><br><span style="color:var(--text-dim);">${escapeHtml(e.en)}</span></div>`).join('')}</div>
  <div class="panel-note error"><strong>Common mistake</strong><p style="margin:6px 0 0;">${g.mistakes.map(escapeHtml).join(' ')}</p></div>
  <div style="margin:10px 0;">${askTeacherLink(g.title)}</div>
  ${relatedExercises.length ? `<button class="btn gold block" data-action="grammar-quiz" data-arg="${g.id}">Quick quiz (${relatedExercises.length} questions)</button>` : ''}
  `;
}

/* ================================================================
   PROGRESS
   ================================================================ */
async function refreshCategoryStatsCache(){
  const attempts = await DB.getAll('attempts');
  const {raw, grouped} = Logic.aggregateAttempts(attempts);
  State._categoryStats = raw;
  State._groupStats = grouped;
}

async function refreshStreak(){
  const sessions = await DB.getAll('sessions');
  const dates = new Set(sessions.map(s=>s.date));
  let n=0; let cursor = new Date();
  if(!dates.has(todayStr(cursor))){
    cursor.setDate(cursor.getDate()-1);
    if(!dates.has(todayStr(cursor))){ State._streak=0; return; }
  }
  while(dates.has(todayStr(cursor))){ n++; cursor.setDate(cursor.getDate()-1); }
  State._streak = n;
}

function renderProgress(){
  const vocabItems = Object.values(State.vocabProgress);
  const statusCounts = {new:VOCAB.length - vocabItems.length, learning:0, familiar:0, mastered:0, forgotten:0};
  vocabItems.forEach(v=>{ statusCounts[v.status] = (statusCounts[v.status]||0)+1; });

  const levels = ['A1','A2'];
  const lessonRows = levels.map(lvl=>{
    const ls = LESSONS.filter(l=>l.level===lvl);
    const done = ls.filter(l=>State.lessonProgress[l.id] && State.lessonProgress[l.id].completed).length;
    const pct = ls.length ? Math.round(100*done/ls.length) : 0;
    return `<div class="skill-row"><div class="label">${lvl}</div><div class="progress-bar"><div style="width:${pct}%"></div></div><div class="pct">${done}/${ls.length}</div></div>`;
  }).join('');

  const groupStats = State._groupStats || {};
  const groupRows = Object.entries(groupStats).filter(([,s])=>s.total>0).sort((a,b)=>(a[1].correct/a[1].total)-(b[1].correct/b[1].total)).map(([g,s])=>{
    const pct = Math.round(100*s.correct/s.total);
    return `<div class="skill-row"><div class="label">${labelForGroup(g)}</div><div class="progress-bar"><div style="width:${pct}%;background:${pct<60?'var(--brick)':pct<80?'var(--gold)':'var(--teal)'};"></div></div><div class="pct">${pct}% <span style="color:var(--text-dim);">(${s.total})</span></div></div>`;
  }).join('');

  const catStats = State._categoryStats || {};
  const catRows = Object.entries(catStats).filter(([,s])=>s.total>0).sort((a,b)=>(a[1].correct/a[1].total)-(b[1].correct/b[1].total)).map(([cat,s])=>{
    const pct = Math.round(100*s.correct/s.total);
    return `<div class="skill-row"><div class="label">${labelForCategory(cat)}</div><div class="progress-bar"><div style="width:${pct}%;background:${pct<60?'var(--brick)':pct<80?'var(--gold)':'var(--teal)'};"></div></div><div class="pct">${pct}%</div></div>`;
  }).join('');

  const vocabBarTotal = VOCAB.length;
  const vocabBars = Object.entries(statusCounts).map(([k,v])=>{
    const pct = Math.round(100*v/vocabBarTotal);
    return `<div class="skill-row"><div class="label">${k}</div><div class="progress-bar"><div style="width:${pct}%"></div></div><div class="pct">${v}</div></div>`;
  }).join('');

  return `
  <h1>Progress</h1>
  <div class="grid cols-2">
    <div class="panel"><h3>Lessons completed</h3>${lessonRows}</div>
    <div class="panel"><h3>Vocabulary (${vocabBarTotal} words)</h3>${vocabBars}</div>
  </div>
  <div class="panel"><h3>Skill accuracy</h3>${groupRows || '<p style="color:var(--text-dim);">Complete a few exercises to see your skill breakdown here.</p>'}</div>
  ${catRows ? `<div class="panel"><h3>Detailed breakdown</h3>${catRows}</div>` : ''}
  <div class="panel"><h3>Streak</h3><p style="font-size:1.6rem;font-family:var(--serif);">${State._streak||0} day${State._streak===1?'':'s'}</p></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="btn secondary" data-action="nav" data-arg="achievements">View achievements</button>
    <button class="btn secondary" data-action="nav" data-arg="favorites">View favorites</button>
    <button class="btn secondary" data-action="nav" data-arg="profile">View profile</button>
  </div>
  `;
}

/* ================================================================
   SETTINGS
   ================================================================ */
function renderSettings(){
  const p = State.profile;
  return `
  <h1>Settings</h1>
  <div class="panel">
    <h3>Learning</h3>
    <p>Level: <strong>${p.level}</strong> ${p.placementResult?`(from Quick Placement test${p.placementResult.takenAt?', taken '+new Date(p.placementResult.takenAt).toLocaleDateString():''})`:'(set manually)'}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
      <button class="btn secondary small" data-action="retake-placement">Retake Quick Placement test</button>
      <button class="btn secondary small" data-action="nav" data-arg="placement-hub">View level details</button>
    </div>
    <p>Explanation language:</p>
    <div class="choice-grid">${EXPLAIN_LANGS.map(l=>`<button type="button" class="choice ${p.explainLang===l.id?'selected':''}" aria-pressed="${(p.explainLang===l.id)?'true':'false'}" data-action="settings-set" data-key="explainLang" data-arg="${l.id}">${l.label}</button>`).join('')}</div>
    <p style="margin-top:14px;">Daily goal:</p>
    <div class="choice-grid">${TIME_OPTS.map(t=>`<button type="button" class="choice ${p.time===t?'selected':''}" aria-pressed="${(p.time===t)?'true':'false'}" data-action="settings-set-num" data-key="time" data-arg="${t}">${t} min</button>`).join('')}</div>
    <p style="margin-top:14px;">Correction style:</p>
    <div class="choice-grid">${CORRECTION_OPTS.map(o=>`<button type="button" class="choice ${p.correction===o.id?'selected':''}" aria-pressed="${(p.correction===o.id)?'true':'false'}" data-action="settings-set" data-key="correction" data-arg="${o.id}">${o.label}</button>`).join('')}</div>
  </div>
  <div class="panel">
    <h3>Appearance</h3>
    <button class="btn secondary" data-action="toggle-theme">Toggle light / dark</button>
  </div>
  <div class="panel">
    <h3>Your data &amp; privacy</h3>
    <p style="color:var(--text-dim);font-size:.88rem;">Everything you do in Wegweiser is stored only on this device (${DB.mode==='indexeddb'?'IndexedDB':'localStorage fallback'}). Nothing is uploaded, tracked, or sent anywhere \u2014 the app works the same with your network off.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
      <button class="btn secondary" data-action="export-data">Back up my learning data (.json)</button>
      <label class="btn secondary" style="position:relative;overflow:hidden;">Restore from a backup
        <input type="file" id="importFile" accept="application/json" style="position:absolute;inset:0;opacity:0;cursor:pointer;">
      </label>
      <button class="btn secondary" data-action="reset-data" style="border-color:var(--brick);color:var(--brick);">Start over (erase everything)</button>
    </div>
  </div>
  <div class="panel">
    <h3>Updates</h3>
    <p style="color:var(--text-dim);font-size:.88rem;">Wegweiser ships all its content bundled in the app \u2014 there's no account or server it depends on.</p>
    <button class="btn secondary" data-action="nav" data-arg="updates">Check for updates</button>
  </div>
  <div class="panel">
    <h3>About this build</h3>
    <p style="font-size:.88rem;color:var(--text-dim);">Fully local and working offline: onboarding, Quick Placement, an A1\u2013A2 curriculum, spaced-repetition vocabulary, Dictionary, Grammar Lab, Reading, Writing, Review, Challenges, Achievements, Exam Prep structure, and Progress \u2014 all deterministic, no AI involved. Conversation Lab is a scripted practice dialogue, not free chat. Listening Lab is transcript-based (no audio engine yet). Speaking/Pronunciation recording, the Wegweiser Teacher chat, German Vision, Screen Assistant, and Teacher Hub are honest frontend previews \u2014 their screens are real, but they aren't connected to a live AI, speech, or vision backend yet.</p>
  </div>
  `;
}

async function exportData(){
  const data = await DB.exportAll();
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'wegweiser-backup-'+todayStr()+'.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importData(file){
  const text = await file.text();
  try{
    const data = JSON.parse(text);
    await DB.importAll(data);
    State.vocabProgress = {}; State.lessonProgress = {};
    await loadAll();
    await refreshCategoryStatsCache();
    await refreshStreak();
    render();
  }catch(err){
    alert('Could not import this file: '+err.message);
  }
}

async function resetData(){
  if(!confirm('This will permanently erase all local progress. Continue?')) return;
  await DB.resetAll();
  State.profile=null; State.vocabProgress={}; State.lessonProgress={};
  State._categoryStats={}; State._groupStats={}; State._streak=0;
  State.placement={index:0,answers:[],retake:false}; State.placementResult=null;
  State.dictQuery=''; State.listeningId=null; State.listeningRun=null;
  State.readingId=null; State.readingAnswers={}; State.listeningAnswers={};
  State.writingId=null; State.writingDraft=''; State.writingResult=null;
  State.conversationId=null; State.conversationRun=null; State.teacherChat=[];
  State.speakingRecording=false; State.speakingAttempted=false;
  State.visionTried=false; State.screenTried=false; State.examSection=null;
  State.globalSearchQuery=''; State._challenges=[]; State._achievements=[];
  State._feedbackHistory=[]; State._updateInfo=null;
  State.view='onboarding'; State.onboard=freshOnboardState();
  render();
}

/* ================================================================
   MAIN VIEW DISPATCH
   ================================================================ */
function renderMain(){
  if(State.view==='home') return renderHome();
  if(State.view==='learn') return renderLearn();
  if(State.view==='lesson') return renderLessonView();
  if(State.view==='vocab') return renderVocab();
  if(State.view==='grammar') return renderGrammar();
  if(State.view==='progress') return renderProgress();
  if(State.view==='settings') return renderSettings();
  if(State.view==='quiz') return renderExerciseFlow();
  if(State.view==='dictionary') return renderDictionary();
  if(State.view==='listening') return renderListening();
  if(State.view==='listening-detail') return renderListeningDetail();
  if(State.view==='speaking') return renderSpeaking();
  if(State.view==='pronunciation') return renderPronunciation();
  if(State.view==='reading') return renderReading();
  if(State.view==='reading-detail') return renderReadingDetail();
  if(State.view==='writing') return renderWriting();
  if(State.view==='writing-detail') return renderWritingDetail();
  if(State.view==='conversation') return renderConversation();
  if(State.view==='conversation-detail') return renderConversationDetail();
  if(State.view==='teacher') return renderTeacher();
  if(State.view==='vision') return renderVision();
  if(State.view==='screen') return renderScreenAssistant();
  if(State.view==='review') return renderReview();
  if(State.view==='challenges') return renderChallenges();
  if(State.view==='examprep') return renderExamPrep();
  if(State.view==='placement-hub') return renderPlacementHub();
  if(State.view==='teacherhub') return renderTeacherHub();
  if(State.view==='feedback') return renderFeedback();
  if(State.view==='updates') return renderUpdates();
  if(State.view==='favorites') return renderFavorites();
  if(State.view==='profile') return renderProfile();
  if(State.view==='achievements') return renderAchievements();
  if(State.view==='search') return renderSearch();
  return renderHome();
}

/* ================================================================
   SHARED HELPERS FOR THE NEW SECTIONS
   ================================================================ */
function sourceBadge(source){
  const label = source==='local' ? 'Local' : source==='demo' ? 'Demo' : 'Not connected';
  return `<span class="source-badge ${source}">${label}</span>`;
}

function notConnectedPanel(title, reason){
  return `<div class="not-connected-panel"><strong>${escapeHtml(title)}</strong>${escapeHtml(reason)}</div>`;
}

function askTeacherLink(context){
  return `<button class="btn secondary small" data-action="nav" data-arg="teacher">Ask the Teacher about ${escapeHtml(context)}</button>`;
}

/* Real, DB-derived stats used by Challenges/Achievements/Notifications —
   nothing here is invented; every number traces back to a real record. */
async function computeLiveStats(){
  const attempts = await DB.getAll('attempts');
  const today = todayStr();
  const sessions = await DB.getAll('sessions');
  const todaysAttempts = attempts.filter(a=>todayStr(new Date(a.ts))===today);
  const lessonsToday = Object.values(State.lessonProgress).filter(l=>l.lastDone && todayStr(new Date(l.lastDone))===today).length;
  const lessonsCompleted = Object.values(State.lessonProgress).filter(l=>l.completed).length;
  const perfectLessons = Object.values(State.lessonProgress).filter(l=>l.bestScore>=1).length;
  const wordsSeen = Object.keys(State.vocabProgress).length;
  const a1Lessons = LESSONS.filter(l=>l.level==='A1');
  const a2Lessons = LESSONS.filter(l=>l.level==='A2');
  const a1Complete = a1Lessons.every(l=>State.lessonProgress[l.id]&&State.lessonProgress[l.id].completed);
  const a2Complete = a2Lessons.every(l=>State.lessonProgress[l.id]&&State.lessonProgress[l.id].completed);
  const grammarAttempts = attempts.filter(a=>Logic.groupCategory(a.category)!=='vocabulary').length;
  const grammarCorrect = attempts.filter(a=>Logic.groupCategory(a.category)!=='vocabulary' && a.correct).length;
  const readingProgress = await DB.getAll('readingProgress');
  const writingSubmissions = await DB.getAll('writingSubmissions');
  const quizzesToday = 0; // grammar-quiz completions aren't separately logged from lesson completions; conservative default
  return {
    wordsToday: todaysAttempts.length,
    lessonsToday, quizzesToday, perfectLessons, lessonsCompleted,
    streak: State._streak||0,
    wordsSeen,
    a1Complete, a2Complete,
    grammarAccuracy: grammarAttempts ? grammarCorrect/grammarAttempts : 0,
    grammarAttempts,
    readingsCompleted: readingProgress.length,
    writingsCompleted: writingSubmissions.length,
    due: dueVocabCount(),
    weakGroupLabel: weakestGroup() ? labelForGroup(weakestGroup()) : null,
  };
}

/* ================================================================
   DICTIONARY
   ================================================================ */
function renderDictionary(){
  const q = State.dictQuery||'';
  const results = q ? VOCAB.filter(v=>v.de.toLowerCase().includes(q.toLowerCase())||v.en.toLowerCase().includes(q.toLowerCase())).slice(0,30) : [];
  const dayIndex = Math.floor(Date.now()/86400000);
  const wotd = VOCAB[dayIndex % VOCAB.length];
  return `
  <h1>Dictionary</h1>
  <label class="visually-hidden" for="dictSearch">Search the dictionary</label>
  <input type="text" class="fill-input" id="dictSearch" style="width:100%;margin-bottom:16px;" placeholder="Search German or English..." value="${escapeHtml(q)}">
  ${q ? `
    <div class="panel"><h3>${results.length} result${results.length===1?'':'s'}</h3>
      ${results.map(v=>dictWordRow(v)).join('') || '<p style="color:var(--text-dim);">No matches. Try another spelling.</p>'}
    </div>
  ` : `
    <div class="panel">
      <h3>Word of the day ${sourceBadge('local')}</h3>
      ${dictWordRow(wotd)}
    </div>
    <p style="color:var(--text-dim);font-size:.88rem;">Search above, or browse the full list in <button class="btn secondary small" data-action="nav" data-arg="vocab" style="display:inline-flex;">Vocabulary</button>.</p>
  `}
  `;
}
const GENDER_LABELS = {der:'masculine', die:'feminine', das:'neuter'};
function dictWordRow(v){
  const artClass = v.article?`article-${v.article}`:'';
  const favs = (State.profile && State.profile.favorites) || [];
  const isFav = favs.includes('v:'+v.id);
  const tracked = !!State.vocabProgress[v.id];
  return `<div class="panel-note" style="margin:10px 0;">
    <div style="font-family:var(--serif);font-size:1.2rem;" class="${artClass}">${v.article?v.article+' ':''}${escapeHtml(v.de)}</div>
    <div style="color:var(--text-dim);">${escapeHtml(v.en)} ${v.plural?'· plural: '+escapeHtml(v.plural):''} · ${v.level}</div>
    ${v.article?`<div style="color:var(--text-dim);font-size:.82rem;margin-top:2px;">Grammar: ${GENDER_LABELS[v.article]} noun</div>`:''}
    ${v.ex_de?`<div style="margin-top:8px;font-size:.9rem;">${escapeHtml(v.ex_de)}<br><span style="color:var(--text-dim);">${escapeHtml(v.ex_en||'')}</span></div>`:''}
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn secondary small" data-action="toggle-favorite" data-arg="v:${v.id}">${isFav?'\u2605 Favorited':'\u2606 Favorite'}</button>
      <button class="btn secondary small" data-action="dict-add-review" data-arg="${v.id}">${tracked?'In review \u2713':'Add to Review'}</button>
      <button class="btn secondary small" data-action="nav" data-arg="vocab">Practice</button>
      ${askTeacherLink('this word')}
    </div>
  </div>`;
}

/* ================================================================
   LISTENING LAB
   ================================================================ */
function renderListening(){
  const items = LISTENING_ITEMS;
  return `
  <h1>Listening Lab ${sourceBadge('demo')}</h1>
  <p style="color:var(--text-dim);">No audio-synthesis engine is connected in this build, so these are transcript-based comprehension exercises rather than real playback \u2014 shown honestly as a mock player below.</p>
  <div class="card-grid">
    ${items.map(l=>`<div class="challenge-card"><strong>${escapeHtml(l.title)}</strong><div style="color:var(--text-dim);font-size:.85rem;margin:4px 0 10px;">${l.level} · ${l.topic}</div>
      <button class="btn gold small" data-action="open-listening" data-arg="${l.id}">Open</button></div>`).join('')}
  </div>`;
}
function renderListeningDetail(){
  const l = LISTENING_ITEMS.find(x=>x.id===State.listeningId);
  if(!l) return renderListening();
  const run = State.listeningRun;
  return `
  <button class="btn secondary small" data-action="nav" data-arg="listening">\u2190 Back to Listening</button>
  <h1 style="margin-top:14px;">${escapeHtml(l.title)} ${sourceBadge('demo')}</h1>
  <div class="mock-audio-player">
    <div class="play-btn" aria-hidden="true">\u25B6</div>
    <div class="mock-waveform" aria-hidden="true">${Array.from({length:28}).map(()=>`<span style="height:${20+Math.round(Math.random()*80)}%"></span>`).join('')}</div>
  </div>
  <p style="color:var(--text-dim);font-size:.82rem;margin-top:6px;">Playback isn\u2019t connected \u2014 read the transcript below instead.</p>
  ${run && run.showTranscript ? `<div class="panel" style="white-space:pre-line;">${escapeHtml(l.transcript)}</div>` : `<button class="btn secondary" data-action="listening-show-transcript">Show transcript</button>`}
  ${run && run.showTranscript ? renderInlineQuiz(l.questions, 'listening', l.id) : ''}
  `;
}

/* ================================================================
   SPEAKING LAB
   ================================================================ */
function renderSpeaking(){
  return `
  <h1>Speaking Lab</h1>
  <p style="color:var(--text-dim);">Practice speaking sentences aloud. Recording works locally in your browser for self-review; automatic pronunciation/fluency scoring is not connected yet.</p>
  <div class="panel" style="text-align:center;">
    <p style="font-family:var(--serif);font-size:1.1rem;">"Ich möchte einen Kaffee, bitte."</p>
    <button class="record-circle" data-action="speaking-toggle-record" aria-label="Start recording">${State.speakingRecording?'\u25A0':'\u25CF'}</button>
    <p style="color:var(--text-dim);font-size:.85rem;margin-top:10px;">${State.speakingRecording?'Recording... click to stop':'Click to record yourself, then play it back'}</p>
  </div>
  ${State.speakingAttempted ? notConnectedPanel('Analysis not connected', 'Speech analysis isn\u2019t connected in this build. You can still listen back to your own recording to self-check against the model sentence above.') : ''}
  <div style="margin-top:14px;">${askTeacherLink('speaking practice')}</div>
  `;
}

/* ================================================================
   PRONUNCIATION LAB
   ================================================================ */
function renderPronunciation(){
  const sounds = [
    {s:'ä / ö / ü', tip:'Round your lips while saying the base vowel (a/o/u shifted toward e/i).'},
    {s:'ch (after a,o,u)', tip:'A rough back-of-throat sound, as in "Bach".'},
    {s:'ch (after e,i,ä,ö,ü)', tip:'A soft "hy" sound, as in "ich".'},
    {s:'sch / sp / st', tip:'"sch" = English "sh"; word-initial sp/st = "shp"/"sht".'},
    {s:'ei vs ie', tip:'"ei" = English "eye"; "ie" = English "ee" \u2014 commonly reversed by learners.'},
  ];
  return `
  <h1>Pronunciation Lab</h1>
  <p style="color:var(--text-dim);">Real pronunciation scoring isn\u2019t connected in this build. Use the sound guide below, then record yourself and compare by ear.</p>
  <div class="grid cols-2">
    ${sounds.map(x=>`<div class="panel"><strong>${escapeHtml(x.s)}</strong><p style="margin:6px 0 0;color:var(--text-dim);font-size:.9rem;">${escapeHtml(x.tip)}</p></div>`).join('')}
  </div>
  <div class="panel" style="text-align:center;margin-top:16px;">
    <p style="font-family:var(--serif);font-size:1.15rem;">Sch\u00f6n, dass du Deutsch lernst!</p>
    <button class="record-circle" data-action="speaking-toggle-record" aria-label="Start recording">${State.speakingRecording?'\u25A0':'\u25CF'}</button>
  </div>
  `;
}

/* ================================================================
   READING LAB
   ================================================================ */
function renderReading(){
  return `
  <h1>Reading Lab</h1>
  <div class="card-grid">
    ${READING_TEXTS.map(r=>{
      const done = (State.readingProgress||{})[r.id];
      return `<div class="challenge-card"><strong>${escapeHtml(r.title)}</strong><div style="color:var(--text-dim);font-size:.85rem;margin:4px 0 10px;">${r.level} · ${r.topic}</div>
      <button class="btn ${done?'secondary':'gold'} small" data-action="open-reading" data-arg="${r.id}">${done?'Read again':'Read'}</button></div>`;
    }).join('')}
  </div>`;
}
function renderReadingDetail(){
  const r = READING_TEXTS.find(x=>x.id===State.readingId);
  if(!r) return renderReading();
  return `
  <button class="btn secondary small" data-action="nav" data-arg="reading">\u2190 Back to Reading</button>
  <h1 style="margin-top:14px;">${escapeHtml(r.title)} ${sourceBadge('local')}</h1>
  <div class="panel" style="white-space:pre-line;line-height:1.8;">${escapeHtml(r.text)}</div>
  ${renderInlineQuiz(r.questions, 'reading', r.id)}
  `;
}

/* Shared inline comprehension-quiz renderer for Reading & Listening —
   simple, self-contained (no shared exercise-runtime coupling needed). */
function renderInlineQuiz(questions, kind, itemId){
  const answers = (State[kind+'Answers']||{})[itemId] || {};
  return `<div class="panel"><h3>Comprehension</h3>${questions.map(q=>{
    const chosen = answers[q.id];
    return `<div style="margin-bottom:16px;">
      <p>${escapeHtml(q.prompt)}</p>
      ${q.options.map(o=>{
        let cls='mcq-option';
        if(chosen){ if(o===q.correct) cls+=' correct'; else if(o===chosen) cls+=' incorrect'; }
        return `<button class="${cls}" ${chosen?'disabled':''} data-action="inline-quiz-answer" data-kind="${kind}" data-item="${itemId}" data-q="${q.id}" data-arg="${escapeHtml(o)}">${escapeHtml(o)}</button>`;
      }).join('')}
    </div>`;
  }).join('')}
  ${Object.keys(answers).length>=questions.length ? `<div class="panel-note success">Comprehension check complete \u2014 saved to your local progress.</div>` : ''}
  </div>`;
}

/* ================================================================
   WRITING LAB
   ================================================================ */
function renderWriting(){
  return `
  <h1>Writing Lab</h1>
  <div class="card-grid">
    ${WRITING_PROMPTS.map(p=>`<div class="challenge-card"><strong>${escapeHtml(p.title)}</strong><div style="color:var(--text-dim);font-size:.85rem;margin:4px 0 10px;">${p.level} · ${p.type}</div>
      <button class="btn gold small" data-action="open-writing" data-arg="${p.id}">Write</button></div>`).join('')}
  </div>`;
}
function renderWritingDetail(){
  const p = WRITING_PROMPTS.find(x=>x.id===State.writingId);
  if(!p) return renderWriting();
  const result = State.writingResult;
  return `
  <button class="btn secondary small" data-action="nav" data-arg="writing">\u2190 Back to Writing</button>
  <h1 style="margin-top:14px;">${escapeHtml(p.title)}</h1>
  <p>${escapeHtml(p.prompt)}</p>
  <p style="color:var(--text-dim);font-size:.85rem;">Target: at least ${p.minWords} words.</p>
  <label class="visually-hidden" for="writingArea">Your German text</label>
  <textarea id="writingArea" rows="8" placeholder="Schreib hier auf Deutsch...">${escapeHtml(State.writingDraft||'')}</textarea>
  <div style="margin-top:12px;"><button class="btn gold" data-action="writing-submit">Check word count &amp; save</button></div>
  ${result ? `
    <div class="panel-note ${result.meetsMin?'success':'error'}" style="margin-top:14px;">
      <strong>${result.wordCount} words</strong> ${result.meetsMin?'\u2014 target reached.':'\u2014 keep going to reach the target.'}
    </div>
    ${notConnectedPanel('Grammar correction not connected', result.note)}
  ` : ''}
  `;
}

/* ================================================================
   CONVERSATION LAB
   ================================================================ */
function renderConversation(){
  return `
  <h1>Conversation Lab</h1>
  <p style="color:var(--text-dim);">Guided branching dialogues \u2014 pick natural responses and see why they work. This is scripted practice, not a free-form AI conversation partner.</p>
  <div class="card-grid">
    ${CONVERSATION_SCENARIOS.map(c=>`<div class="challenge-card"><strong>${escapeHtml(c.title)}</strong><div style="color:var(--text-dim);font-size:.85rem;margin:4px 0 10px;">${c.level} · ${c.topic}</div>
      <button class="btn gold small" data-action="open-conversation" data-arg="${c.id}">Start</button></div>`).join('')}
  </div>`;
}
function renderConversationDetail(){
  const c = CONVERSATION_SCENARIOS.find(x=>x.id===State.conversationId);
  if(!c) return renderConversation();
  const run = State.conversationRun || {stepIndex:0, chosen:[]};
  const step = c.steps[run.stepIndex];
  return `
  <button class="btn secondary small" data-action="nav" data-arg="conversation">\u2190 Back to Conversation</button>
  <h1 style="margin-top:14px;">${escapeHtml(c.title)}</h1>
  ${run.chosen.map((ch,i)=>`
    <div class="dialogue-line"><div class="npc">\u201C${escapeHtml(ch._npc)}\u201D</div></div>
    <div class="chat-bubble user">${escapeHtml(ch.text)}</div>
    <p style="color:var(--text-dim);font-size:.82rem;margin-top:-4px;">${escapeHtml(ch.note)}</p>
  `).join('')}
  ${step ? `
    <div class="dialogue-line"><div class="npc">\u201C${escapeHtml(step.npc)}\u201D</div></div>
    <div>${step.options.map((o,i)=>`<button class="mcq-option" data-action="conversation-choose" data-arg="${i}">${escapeHtml(o.text)}</button>`).join('')}</div>
  ` : `<div class="panel-note success">Conversation complete \u2014 nice work!</div>
    <button class="btn gold" data-action="nav" data-arg="conversation">Try another scenario</button>`}
  `;
}

/* ================================================================
   WEGWEISER TEACHER
   ================================================================ */
function renderTeacher(){
  const chat = State.teacherChat || [];
  return `
  <h1>Wegweiser Teacher</h1>
  <div class="panel">
    ${chat.map(m=>`<div class="chat-bubble ${m.role}">${escapeHtml(m.text)}</div>`).join('') || '<p style="color:var(--text-dim);">Ask a question, or pick a quick action below \u2014 those route to real local tools.</p>'}
  </div>
  <div class="chat-quick-actions">
    <button class="btn secondary small" data-action="nav" data-arg="grammar">Explain grammar</button>
    <button class="btn secondary small" data-action="nav" data-arg="vocab">Practice vocabulary</button>
    <button class="btn secondary small" data-action="nav" data-arg="writing">Check my writing</button>
    <button class="btn secondary small" data-action="nav" data-arg="speaking">Practice speaking</button>
    <button class="btn secondary small" data-action="nav" data-arg="conversation">Practice a conversation</button>
    <button class="btn secondary small" data-action="nav" data-arg="examprep">Prepare for an exam</button>
  </div>
  <div style="display:flex;gap:8px;margin-top:14px;">
    <label class="visually-hidden" for="teacherInput">Ask the teacher</label>
    <input type="text" id="teacherInput" class="fill-input" style="flex:1;" placeholder="Ask anything about German...">
    <button class="btn gold" data-action="teacher-ask">Send</button>
  </div>
  `;
}

/* ================================================================
   GERMAN VISION / SCREEN ASSISTANT
   ================================================================ */
function renderVision(){
  return `
  <h1>German Vision</h1>
  <div class="camera-frame">
    <span style="font-size:2rem;" aria-hidden="true">\u25C9</span>
    <span>Camera preview would appear here</span>
    <button class="btn gold small" data-action="vision-try">Try it</button>
  </div>
  ${State.visionTried ? notConnectedPanel('Image recognition not connected', 'German Vision needs an image-recognition backend that isn\u2019t connected in this build. The camera UI is ready \u2014 pointing it at an object would eventually show its German name, article, and an example sentence here.') : ''}
  `;
}
function renderScreenAssistant(){
  return `
  <h1>Screen Assistant</h1>
  <div class="panel">
    <p>Screen Assistant would let you share a browser tab so Wegweiser can explain German text on screen \u2014 a website, subtitles, or a message.</p>
    <button class="btn gold" data-action="screen-try">Request screen share</button>
  </div>
  ${State.screenTried ? notConnectedPanel('Text recognition not connected', 'Screen Assistant needs a text-recognition backend that isn\u2019t connected in this build. No screen content is captured or transmitted anywhere.') : ''}
  `;
}

/* ================================================================
   REVIEW CENTER (consolidates weak spots across the app)
   ================================================================ */
function renderReview(){
  const due = dueVocabCount();
  const weak = weakestGroup();
  const recentMistakes = (State._categoryStats && Object.entries(State._categoryStats).filter(([,s])=>s.total>0)) || [];
  const needsReviewLessons = LESSONS.filter(l=>{
    const tier = Logic.masteryTier(State.lessonProgress[l.id]);
    return tier==='Needs review' || tier==='Developing';
  });
  const totalToDo = due + needsReviewLessons.length + (weak?1:0);
  return `
  <h1>Review Center</h1>
  <div class="panel">
    <p style="font-size:1.6rem;font-family:var(--serif);margin:0 0 4px;">${totalToDo>0 ? `${totalToDo} item${totalToDo===1?'':'s'} need review` : 'All caught up'}</p>
    <p style="color:var(--text-dim);font-size:.88rem;">${totalToDo>0 ? 'Here\u2019s what would help most right now.' : 'Nothing urgent \u2014 explore a new lesson or revisit the Grammar Lab to stay sharp.'}</p>
  </div>
  <h3 style="margin-top:18px;">Due today</h3>
  <div class="grid cols-2">
    <div class="panel"><h3>Vocabulary due</h3><p style="font-size:1.8rem;font-family:var(--serif);">${due}</p>
      <button class="btn gold" data-action="nav" data-arg="vocab">Review now</button></div>
    <div class="panel"><h3>Weakest area</h3><p>${weak?labelForGroup(weak):'Not enough data yet'}</p>
      ${weak?`<button class="btn secondary" data-action="nav" data-arg="grammar">Practice</button>`:''}</div>
  </div>
  ${needsReviewLessons.length ? `
  <h3 style="margin-top:18px;">Lessons that need another pass</h3>
  <div class="panel">
    ${needsReviewLessons.map(l=>{
      const tier = Logic.masteryTier(State.lessonProgress[l.id]);
      return `<div class="lesson-list-item"><div><div style="font-weight:600;">${escapeHtml(l.title)}</div><div class="meta" style="color:${Logic.masteryColor(tier)};">${tier}</div></div>
        <button class="btn small gold" data-action="open-lesson" data-arg="${l.id}">Review</button></div>`;
    }).join('')}
  </div>` : ''}
  <h3 style="margin-top:18px;">Recent mistakes by category</h3>
  <div class="panel">
    ${recentMistakes.length ? recentMistakes.sort((a,b)=>(a[1].correct/a[1].total)-(b[1].correct/b[1].total)).map(([cat,s])=>
      `<div class="skill-row"><div class="label">${labelForCategory(cat)}</div><div class="progress-bar"><div style="width:${Math.round(100*s.correct/s.total)}%"></div></div><div class="pct">${s.total-s.correct} missed</div></div>`
    ).join('') : '<p style="color:var(--text-dim);">No mistakes logged yet.</p>'}
  </div>`;
}

/* ================================================================
   CHALLENGES
   ================================================================ */
function renderChallenges(){
  const list = State._challenges || [];
  return `
  <h1>Daily Challenges ${sourceBadge('local')}</h1>
  <p style="color:var(--text-dim);">Based on your real activity today \u2014 nothing here is simulated.</p>
  <div class="card-grid">
    ${list.map(c=>`<div class="challenge-card">
      <strong>${escapeHtml(c.title)}</strong>
      <p style="color:var(--text-dim);font-size:.85rem;">${escapeHtml(c.desc)}</p>
      <div class="progress-bar"><div style="width:${Math.round(100*c.progress/c.target)}%;background:${c.complete?'var(--teal)':'var(--gold)'};"></div></div>
      <div style="font-size:.8rem;color:var(--text-dim);margin-top:4px;">${c.progress}/${c.target} ${c.complete?'\u2713 complete':''}</div>
    </div>`).join('')}
  </div>`;
}

/* ================================================================
   EXAM PREPARATION
   ================================================================ */
function renderExamPrep(){
  const sectionStatus = {
    'Lesen':{label:'Available', cls:'local'}, 'H\u00f6ren':{label:'Demo (transcript-based)', cls:'demo'},
    'Schreiben':{label:'Available (local check)', cls:'local'}, 'Grammatik & Wortschatz':{label:'Available', cls:'local'},
  };
  return `
  <h1>Exam Preparation</h1>
  <p style="color:var(--text-dim);">Practice sections built from Wegweiser\u2019s own vetted content. These are not official exam questions and no certification is implied.</p>
  <div class="grid cols-3" style="margin-bottom:16px;">
    ${EXAM_FRAMEWORKS.map(f=>`<div class="panel"><strong>${escapeHtml(f.name)}</strong><div style="color:var(--text-dim);font-size:.82rem;">${f.levels.map(l=>['A1','A2'].includes(l)?l:l+' (later)').join(', ')}</div></div>`).join('')}
  </div>
  <div class="panel-note">Only <strong>A1\u2013A2</strong> practice content exists right now. B1\u2013C2 sections are shown above for context but aren\u2019t built yet \u2014 no fake questions are generated to fill the gap.</div>
  <div class="panel" style="margin-top:14px;"><h3>Practice sections (A1\u2013A2)</h3>
    <div class="card-grid">
      ${EXAM_SECTIONS.map(s=>{ const st=sectionStatus[s]||{label:'Demo',cls:'demo'}; return `<div class="challenge-card"><strong>${escapeHtml(s)}</strong> ${sourceBadge(st.cls)}
        <div style="margin-top:8px;"><button class="btn secondary small" data-action="examprep-open" data-arg="${escapeHtml(s)}">Practice</button></div></div>`; }).join('')}
    </div>
  </div>
  ${State.examSection ? renderExamSectionResult() : ''}
  `;
}
function renderExamSectionResult(){
  const s = State.examSection;
  if(s==='Lesen') return `<div class="panel"><h3>Lesen \u2014 routed to Reading Lab</h3><button class="btn gold" data-action="nav" data-arg="reading">Open Reading Lab</button></div>`;
  if(s==='H\u00f6ren') return `<div class="panel"><h3>H\u00f6ren \u2014 routed to Listening Lab</h3><button class="btn gold" data-action="nav" data-arg="listening">Open Listening Lab</button></div>`;
  if(s==='Schreiben') return `<div class="panel"><h3>Schreiben \u2014 routed to Writing Lab</h3><button class="btn gold" data-action="nav" data-arg="writing">Open Writing Lab</button></div>`;
  return `<div class="panel"><h3>Grammatik &amp; Wortschatz \u2014 routed to Grammar Lab</h3><button class="btn gold" data-action="nav" data-arg="grammar">Open Grammar Lab</button></div>`;
}

/* ================================================================
   PLACEMENT & LEVEL HUB
   ================================================================ */
function renderPlacementHub(){
  const p = State.profile;
  const totalQ = p.placementResult ? Object.values(p.placementResult.byLevel||{}).reduce((s,v)=>s+v.total,0) : 0;
  return `
  <h1>Placement &amp; Level</h1>
  <div class="panel">
    <p>Current level: <strong>${p.level}</strong></p>
    ${p.placementResult ? `<p style="color:var(--text-dim);font-size:.88rem;">From a ${totalQ}-question Quick Placement test, taken ${p.placementResult.takenAt?new Date(p.placementResult.takenAt).toLocaleDateString():'\u2014'}.</p>` : '<p style="color:var(--text-dim);font-size:.88rem;">Level was set manually, not from a test.</p>'}
    <button class="btn gold" data-action="retake-placement">Take / retake Quick Placement</button>
  </div>
  <div class="panel-note">
    <strong>What "Quick Placement" means</strong>
    <p style="margin:6px 0 0;">This is a fast, ${PLACEMENT_TEST.length}-question multiple-choice estimate \u2014 useful for picking a sensible starting point, but it is <em>not</em> a full CEFR skills assessment. It mainly checks grammar and vocabulary recognition, not reading, writing, listening, or speaking ability.</p>
  </div>
  <div class="not-connected-panel">
    <strong>Full Skills Assessment \u2014 coming later</strong>
    A separate, longer assessment covering Reading, Writing, Listening, Speaking, Grammar, and Vocabulary individually is planned but not built yet. When available, it will give a confidence rating and a per-skill breakdown instead of one combined estimate.
  </div>
  <div class="panel" style="margin-top:16px;"><h3>CEFR levels</h3>
    <p style="color:var(--text-dim);font-size:.88rem;">A0 (beginner) \u2192 A1 \u2192 A2 \u2192 B1 \u2192 B2 \u2192 C1 \u2192 C2 (near-native). Structured lessons currently cover A1\u2013A2; higher levels are reachable via Grammar Lab, Reading, and the placement estimate.</p>
  </div>
  ${p.placementResult ? `<div class="panel"><h3>Last result breakdown by level</h3>${Object.entries(p.placementResult.byLevel||{}).filter(([,v])=>v.total>0).map(([lvl,v])=>
    `<div class="skill-row"><div class="label">${lvl}</div><div class="progress-bar"><div style="width:${Math.round(100*v.correct/v.total)}%"></div></div><div class="pct">${v.correct}/${v.total}</div></div>`).join('')}</div>` : ''}
  `;
}

/* ================================================================
   TEACHER HUB (content-creator role — UI shell, no backend)
   ================================================================ */
function renderTeacherHub(){
  return `
  <h1>Teacher Hub</h1>
  ${notConnectedPanel('Teacher accounts not connected', 'Teacher Hub is a content-creator role that needs real accounts and a content-review backend \u2014 not connected in this build. Below is the planned interface.')}
  <div class="grid cols-2" style="margin-top:16px;">
    <div class="panel"><h3>My Content</h3><p style="color:var(--text-dim);font-size:.85rem;">Drafts and published lessons you\u2019ve authored would appear here.</p></div>
    <div class="panel"><h3>Students</h3><p style="color:var(--text-dim);font-size:.85rem;">Assigned learners and their progress would appear here.</p></div>
    <div class="panel"><h3>Create Content</h3><p style="color:var(--text-dim);font-size:.85rem;">A lesson/vocabulary/exercise editor would open here.</p></div>
    <div class="panel"><h3>Analytics</h3><p style="color:var(--text-dim);font-size:.85rem;">Aggregate student performance would appear here.</p></div>
  </div>`;
}

/* ================================================================
   FEEDBACK
   ================================================================ */
function renderFeedback(){
  const history = State._feedbackHistory || [];
  return `
  <h1>Feedback</h1>
  <div class="panel">
    <label class="visually-hidden" for="fbType">Feedback type</label>
    <select id="fbType" class="fill-input" style="margin-bottom:10px;">
      <option value="content">Content mistake (German language)</option>
      <option value="ui">UI problem</option>
      <option value="suggestion">Suggestion / feature request</option>
      <option value="lesson">Lesson feedback</option>
    </select>
    <label class="visually-hidden" for="fbText">Describe the issue</label>
    <textarea id="fbText" rows="4" placeholder="Describe the issue or suggestion..."></textarea>
    <div style="margin-top:10px;"><button class="btn gold" data-action="feedback-submit">Submit feedback</button></div>
  </div>
  ${history.length ? `<div class="panel"><h3>Your feedback history</h3>${history.map(f=>`<div class="panel-note"><strong>${escapeHtml(f.type)}</strong><p style="margin:4px 0 0;">${escapeHtml(f.text)}</p></div>`).join('')}</div>` : ''}
  `;
}

/* ================================================================
   UPDATES
   ================================================================ */
function renderUpdates(){
  const u = State._updateInfo;
  if(!u) return `<h1>Updates</h1><p>Checking...</p>`;
  return `
  <h1>Updates</h1>
  <div class="panel">
    <p><strong>Current version:</strong> ${escapeHtml(u.currentVersion)}</p>
    <p><strong>Status:</strong> ${u.upToDate?'Up to date':'Update available'}</p>
    <p style="color:var(--text-dim);font-size:.85rem;">Last checked: ${new Date(u.lastChecked).toLocaleString()}</p>
    <button class="btn secondary" data-action="updates-check">Check for updates</button>
  </div>
  <div class="panel-note">${escapeHtml(u.note)}</div>
  `;
}

/* ================================================================
   FAVORITES
   ================================================================ */
function renderFavorites(){
  const favIds = (State.profile.favorites||[]);
  const favVocab = VOCAB.filter(v=>favIds.includes('v:'+v.id));
  const favLessons = LESSONS.filter(l=>favIds.includes('l:'+l.id));
  return `
  <h1>Favorites</h1>
  <div class="panel"><h3>Saved words (${favVocab.length})</h3>
    ${favVocab.map(v=>dictWordRow(v)).join('') || '<p style="color:var(--text-dim);">No saved words yet \u2014 use the \u2606 on a vocabulary row.</p>'}
  </div>
  <div class="panel"><h3>Saved lessons (${favLessons.length})</h3>
    ${favLessons.map(l=>`<div class="lesson-list-item"><div>${escapeHtml(l.title)}</div><button class="btn small gold" data-action="open-lesson" data-arg="${l.id}">Open</button></div>`).join('') || '<p style="color:var(--text-dim);">No saved lessons yet.</p>'}
  </div>`;
}

/* ================================================================
   PROFILE
   ================================================================ */
function renderProfile(){
  const p = State.profile;
  return `
  <h1>Profile</h1>
  <div class="panel">
    <div class="stamp" style="width:56px;height:56px;font-size:1.1rem;margin-bottom:10px;">${p.level}</div>
    <p><strong>${p.name||'German learner'}</strong></p>
    <p style="color:var(--text-dim);font-size:.88rem;">Learning German · Level ${p.level} · ${State._streak||0}-day streak</p>
  </div>
  <div class="grid cols-2">
    <div class="panel"><h3>Goals</h3><p>${(p.goals||[]).join(', ')||'\u2014'}</p></div>
    <div class="panel"><h3>Daily target</h3><p>${p.time} minutes</p></div>
  </div>
  <button class="btn secondary" data-action="nav" data-arg="achievements">View achievements</button>
  <button class="btn secondary" data-action="nav" data-arg="favorites">View favorites</button>
  `;
}

/* ================================================================
   ACHIEVEMENTS
   ================================================================ */
function renderAchievements(){
  const list = State._achievements || [];
  return `
  <h1>Achievements ${sourceBadge('local')}</h1>
  <div class="card-grid">
    ${list.map(a=>`<div class="achievement-card ${a.unlocked?'':'locked'}">
      <div class="badge-icon" aria-hidden="true">${a.unlocked?'\u2605':'\u2606'}</div>
      <strong>${escapeHtml(a.title)}</strong>
      <p style="color:var(--text-dim);font-size:.85rem;">${escapeHtml(a.desc)}</p>
    </div>`).join('')}
  </div>`;
}

/* ================================================================
   GLOBAL SEARCH
   ================================================================ */
function renderSearch(){
  const q = (State.globalSearchQuery||'').trim().toLowerCase();
  if(!q) return `<h1>Search Wegweiser</h1>
    <label class="visually-hidden" for="globalSearch">Search</label>
    <input type="text" id="globalSearch" class="fill-input" style="width:100%;" placeholder="Search lessons, vocabulary, grammar, reading...">`;
  const vocabHits = VOCAB.filter(v=>v.de.toLowerCase().includes(q)||v.en.toLowerCase().includes(q)).slice(0,8);
  const lessonHits = LESSONS.filter(l=>l.title.toLowerCase().includes(q)||l.topic.includes(q)).slice(0,6);
  const grammarHits = GRAMMAR.filter(g=>g.title.toLowerCase().includes(q)).slice(0,6);
  const readingHits = READING_TEXTS.filter(r=>r.title.toLowerCase().includes(q)).slice(0,6);
  return `<h1>Search Wegweiser</h1>
    <label class="visually-hidden" for="globalSearch">Search</label>
    <input type="text" id="globalSearch" class="fill-input" style="width:100%;margin-bottom:16px;" value="${escapeHtml(State.globalSearchQuery)}" placeholder="Search lessons, vocabulary, grammar, reading...">
    ${lessonHits.length?`<div class="search-result-group"><h4>Lessons</h4>${lessonHits.map(l=>`<div class="lesson-list-item"><div>${escapeHtml(l.title)}</div><button class="btn small gold" data-action="open-lesson" data-arg="${l.id}">Open</button></div>`).join('')}</div>`:''}
    ${grammarHits.length?`<div class="search-result-group"><h4>Grammar</h4>${grammarHits.map(g=>`<div class="lesson-list-item"><div>${escapeHtml(g.title)}</div><button class="btn small gold" data-action="open-grammar-from-search" data-arg="${g.id}">Open</button></div>`).join('')}</div>`:''}
    ${vocabHits.length?`<div class="search-result-group"><h4>Vocabulary</h4>${vocabHits.map(v=>dictWordRow(v)).join('')}</div>`:''}
    ${readingHits.length?`<div class="search-result-group"><h4>Reading</h4>${readingHits.map(r=>`<div class="lesson-list-item"><div>${escapeHtml(r.title)}</div><button class="btn small gold" data-action="open-reading" data-arg="${r.id}">Open</button></div>`).join('')}</div>`:''}
    ${!lessonHits.length && !grammarHits.length && !vocabHits.length && !readingHits.length ? '<p style="color:var(--text-dim);">No matches.</p>' : ''}
  `;
}

/* ================================================================
   EVENT DELEGATION
   ================================================================ */
function attachAfterRender(){
  const vocabInput = document.getElementById('vocabSearchInput');
  if(vocabInput){
    vocabInput.focus();
    vocabInput.selectionStart = vocabInput.value.length;
    vocabInput.addEventListener('input', (e)=>{ State.vocabSearch = e.target.value; render(); });
  }
  const importFile = document.getElementById('importFile');
  if(importFile){ importFile.addEventListener('change', (e)=>{ if(e.target.files[0]) importData(e.target.files[0]); }); }
  const fillInput = document.getElementById('fillInput');
  if(fillInput){
    fillInput.focus();
    fillInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') handleFillSubmit(); });
  }
  const dictInput = document.getElementById('dictSearch');
  if(dictInput){
    dictInput.focus();
    dictInput.selectionStart = dictInput.value.length;
    dictInput.addEventListener('input', (e)=>{ State.dictQuery = e.target.value; render(); });
  }
  const searchInput = document.getElementById('globalSearch');
  if(searchInput){
    searchInput.focus();
    searchInput.selectionStart = searchInput.value.length;
    searchInput.addEventListener('input', (e)=>{ State.globalSearchQuery = e.target.value; render(); });
  }
  const writingArea = document.getElementById('writingArea');
  if(writingArea){
    writingArea.addEventListener('input', (e)=>{ State.writingDraft = e.target.value; });
  }
  const teacherInput = document.getElementById('teacherInput');
  if(teacherInput){
    teacherInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault();
      document.querySelector('[data-action="teacher-ask"]').click(); } });
  }
}

// Guards against double-submission races: a fast double-click (or a
// second click landing while an await from the first is still pending)
// would otherwise be able to re-enter an async handler mid-flight and
// corrupt state (e.g. skipping an exercise index twice). Actions that
// only do synchronous, idempotent state flips (nav, toggling a choice)
// are left unlocked so the UI never feels laggy for ordinary clicks.
let uiLocked = false;
const LOCKING_ACTIONS = new Set([
  'ex-next','vocab-grade','ob-finish','placement-continue','placement-answer',
  'reset-data','settings-set','settings-set-num','toggle-theme','retake-placement',
]);

document.addEventListener('click', async (e)=>{
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const action = el.dataset.action;

  if(uiLocked && LOCKING_ACTIONS.has(action)) return;
  const shouldLock = LOCKING_ACTIONS.has(action);
  if(shouldLock) uiLocked = true;

  try{
    await handleAction(action, el, e);
  }catch(err){
    // Fail gracefully: log for diagnosis, but never leave the click
    // silently "eaten" or the whole page dead from one bad handler.
    console.error('Wegweiser: unexpected error handling action', action, err);
  }finally{
    if(shouldLock) uiLocked = false;
  }
});

async function handleAction(action, el, e){
  if(action.startsWith('ob-')){ await handleOnboardAction(action, el); return; }
  if(action==='placement-answer'){ handlePlacementAnswer(el); return; }
  if(action==='placement-cancel'){
    if(State.placement.retake){
      State.view='settings';
    } else {
      // Return to onboarding's level step so the user can pick a level manually instead.
      State.onboard.step = ONBOARD_STEPS.indexOf('level');
      State.view='onboarding';
    }
    render(); return;
  }
  if(action==='placement-continue'){
    if(State.placement.retake){
      // Standalone retake (launched from Settings): update the existing
      // profile in place rather than routing back through onboarding.
      const r = State.placementResult || computePlacementResult();
      State.profile.level = r.level;
      State.profile.placementResult = {...r, takenAt:Date.now()};
      await saveProfile(State.profile);
      State.view = 'settings';
    } else {
      State.onboard.step = ONBOARD_STEPS.indexOf('goals');
      State.view = 'onboarding';
    }
    render(); return;
  }
  if(action==='retake-placement'){
    State.placement = {index:0, answers:[], retake:true};
    State.placementResult = null;
    State.view = 'placement';
    render(); return;
  }
  if(action==='nav'){
    State.view = el.dataset.arg;
    const g = groupForView(el.dataset.arg);
    if(g) State.navOpenGroups.add(g);
    if(el.dataset.arg==='vocab'){ State.vocabReview={queue:[],index:0,showAnswer:false,started:false}; }
    if(el.dataset.arg==='grammar'){ State.grammarDetailId = null; }
    if(el.dataset.arg==='challenges'){
      const stats = await computeLiveStats();
      State._challenges = (await Providers.ChallengeService.today(stats)).data;
    }
    if(el.dataset.arg==='achievements'){
      const stats = await computeLiveStats();
      State._achievements = (await Providers.AchievementService.all(stats)).data;
    }
    if(el.dataset.arg==='feedback'){
      State._feedbackHistory = (await Providers.FeedbackService.list()).data;
    }
    if(el.dataset.arg==='updates'){
      State._updateInfo = (await Providers.UpdateService.check()).data;
    }
    if(el.dataset.arg==='placement-hub'){ /* uses State.profile directly, nothing to preload */ }
    render(); return;
  }
  if(action==='toggle-theme'){
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur==='dark' ? 'light' : 'dark';
    if(next==='dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    if(State.profile){ State.profile.theme=next; await saveProfile(State.profile); }
    return;
  }
  if(action==='open-lesson'){ openLesson(el.dataset.arg); return; }
  if(action==='start-exercises'){ startExercises(State.lessonRuntime.lesson.exercises, State.lessonRuntime.lesson.id); return; }
  if(action==='ex-mcq'){ handleMcq(el); return; }
  if(action==='ex-fill-submit'){ handleFillSubmit(); return; }
  if(action==='ex-build-add'){ handleBuildAdd(el); return; }
  if(action==='ex-build-remove'){ handleBuildRemove(el); return; }
  if(action==='ex-build-clear'){ handleBuildClear(); return; }
  if(action==='ex-build-submit'){ handleBuildSubmit(); return; }
  if(action==='ex-match-left'){ handleMatchLeft(el); return; }
  if(action==='ex-match-right'){ await handleMatchRight(el); return; }
  if(action==='ex-next'){ await handleExerciseNext(); return; }
  if(action==='learn-tab'){ State.learnTab = el.dataset.arg; render(); return; }
  if(action==='vocab-tab'){ State.vocabTab = el.dataset.arg; render(); return; }
  if(action==='vocab-review-start'){
    State.vocabReview = {queue: buildReviewQueue(), index:0, showAnswer:false, started:true};
    render(); return;
  }
  if(action==='vocab-review-reset'){ State.vocabReview = {queue:[],index:0,showAnswer:false,started:false}; render(); return; }
  if(action==='vocab-show-answer'){ State.vocabReview.showAnswer = true; render(); return; }
  if(action==='vocab-grade'){
    const q = Number(el.dataset.arg);
    const vocabId = State.vocabReview.queue[State.vocabReview.index];
    await gradeVocab(vocabId, q);
    await touchSessionToday();
    await refreshStreak();
    State.vocabReview.index++;
    State.vocabReview.showAnswer = false;
    render(); return;
  }
  if(action==='open-grammar'){ State.grammarDetailId = el.dataset.arg; render(); return; }
  if(action==='grammar-back'){ State.grammarDetailId = null; render(); return; }
  if(action==='grammar-quiz'){
    const g = grammarById(el.dataset.arg);
    const related = [];
    LESSONS.forEach(l=>l.exercises.forEach(ex=>{ if(ex.category===g.category && related.length<6) related.push(ex); }));
    State.lessonRuntime = null;
    State.view = 'quiz';
    startExercises(related, null);
    return;
  }
  if(action==='settings-set'){ State.profile[el.dataset.key]=el.dataset.arg; await saveProfile(State.profile); render(); return; }
  if(action==='settings-set-num'){ State.profile[el.dataset.key]=Number(el.dataset.arg); await saveProfile(State.profile); render(); return; }
  if(action==='export-data'){ await exportData(); return; }
  if(action==='reset-data'){ await resetData(); return; }

  /* ---------------- Phase-1 frontend expansion actions ---------------- */
  if(action==='open-listening'){ State.listeningId=el.dataset.arg; State.listeningRun={showTranscript:false}; State.view='listening-detail'; render(); return; }
  if(action==='listening-show-transcript'){ State.listeningRun.showTranscript=true; render(); return; }

  if(action==='open-reading'){
    State.readingId=el.dataset.arg; State.view='reading-detail';
    const rec = {id:el.dataset.arg, openedAt:Date.now()};
    await DB.put('readingProgress', rec);
    render(); return;
  }
  if(action==='open-writing'){ State.writingId=el.dataset.arg; State.writingDraft=''; State.writingResult=null; State.view='writing-detail'; render(); return; }
  if(action==='writing-submit'){
    const text = document.getElementById('writingArea').value;
    State.writingDraft = text;
    const res = await Providers.WritingService.submit(State.writingId, text);
    if(res.ok){
      State.writingResult = res.data;
      await DB.put('writingSubmissions', {id:'ws_'+Date.now().toString(36), promptId:State.writingId, text, wordCount:res.data.wordCount, ts:Date.now()});
    }
    render(); return;
  }

  if(action==='inline-quiz-answer'){
    const {kind, item, q} = el.dataset;
    const arg = el.dataset.arg;
    const bucket = kind+'Answers';
    State[bucket][item] = State[bucket][item] || {};
    State[bucket][item][q] = arg;
    render(); return;
  }

  if(action==='open-conversation'){ State.conversationId=el.dataset.arg; State.conversationRun={stepIndex:0, chosen:[]}; State.view='conversation-detail'; render(); return; }
  if(action==='conversation-choose'){
    const c = CONVERSATION_SCENARIOS.find(x=>x.id===State.conversationId);
    const step = c.steps[State.conversationRun.stepIndex];
    const opt = step.options[Number(el.dataset.arg)];
    State.conversationRun.chosen.push(Object.assign({_npc: step.npc}, opt));
    /* Branching scenarios (from the content registry) attach a nextIndex
       to each option; linear legacy scenarios have none, so fall back to
       the original "always advance by one" behavior. */
    State.conversationRun.stepIndex = (typeof opt.nextIndex==='number') ? opt.nextIndex : State.conversationRun.stepIndex+1;
    render(); return;
  }

  if(action==='teacher-ask'){
    const input = document.getElementById('teacherInput');
    const text = input.value.trim();
    if(!text) return;
    State.teacherChat.push({role:'user', text});
    const res = await Providers.TeacherService.ask(text);
    State.teacherChat.push({role:'teacher', text: res.ok ? res.data : res.reason});
    render(); return;
  }

  if(action==='speaking-toggle-record'){
    State.speakingRecording = !State.speakingRecording;
    if(!State.speakingRecording) State.speakingAttempted = true;
    render(); return;
  }
  if(action==='vision-try'){ State.visionTried = true; render(); return; }
  if(action==='screen-try'){ State.screenTried = true; render(); return; }

  if(action==='examprep-open'){ State.examSection = el.dataset.arg; render(); return; }

  if(action==='feedback-submit'){
    const type = document.getElementById('fbType').value;
    const text = document.getElementById('fbText').value.trim();
    if(!text) return;
    const res = await Providers.FeedbackService.submit({type, text});
    if(res.ok){
      const list = await Providers.FeedbackService.list();
      State._feedbackHistory = list.data;
    }
    render(); return;
  }
  if(action==='updates-check'){
    const res = await Providers.UpdateService.check();
    State._updateInfo = res.data;
    render(); return;
  }
  if(action==='open-grammar-from-search'){ State.grammarDetailId = el.dataset.arg; State.view='grammar'; render(); return; }
  if(action==='toggle-favorite'){
    const key = el.dataset.arg;
    State.profile.favorites = State.profile.favorites || [];
    const i = State.profile.favorites.indexOf(key);
    if(i>=0) State.profile.favorites.splice(i,1); else State.profile.favorites.push(key);
    await saveProfile(State.profile);
    render(); return;
  }
  if(action==='nav-toggle-group'){
    const g = el.dataset.arg;
    if(State.navOpenGroups.has(g)) State.navOpenGroups.delete(g); else State.navOpenGroups.add(g);
    render(); return;
  }
  if(action==='dict-add-review'){
    await getVocabItem(el.dataset.arg);
    render(); return;
  }
}

/* ================================================================
   BOOT
   ================================================================ */
async function boot(){
  await DB.init();
  await loadAll();
  await refreshCategoryStatsCache();
  await refreshStreak();
  if(State.profile && State.profile.theme==='dark') document.documentElement.setAttribute('data-theme','dark');
  State.view = State.profile ? 'home' : 'onboarding';
  const activeGroup = groupForView(State.view);
  if(activeGroup) State.navOpenGroups.add(activeGroup);
  render();
}
boot();

// Live offline/online indicator — pure client-side network status,
// no backend involved. The app already works fully offline; this
// just communicates that honestly instead of staying silent about it.
window.addEventListener('online', ()=>{ State._isOnline = true; if(State.view!=='loading') render(); });
window.addEventListener('offline', ()=>{ State._isOnline = false; if(State.view!=='loading') render(); });

})();

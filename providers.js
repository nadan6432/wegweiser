/* ============================================================
   PROVIDERS — the frontend/backend seam.
   Every future service (auth, cloud sync, real AI, real speech,
   real vision) will eventually replace ONE of these objects
   without the UI code changing shape. Today, each provider is
   backed by local data, IndexedDB, or an honest "unavailable"
   response — never a faked result dressed up as real.

   Every provider method returns a Promise resolving to:
     {ok:true,  data:<result>, source:'local'|'demo'}
     {ok:false, reason:<string>, source:'unavailable'}
   `source` lets the UI show an honest badge ("Local", "Demo",
   "Not connected yet") next to whatever it renders — the app
   should never claim a capability it doesn't have (see NO FAKE
   AI in the product principles).
   ============================================================ */
const Providers = (() => {

  function ok(data, source){ return Promise.resolve({ok:true, data, source: source||'local'}); }
  function unavailable(reason){ return Promise.resolve({ok:false, reason, source:'unavailable'}); }

  /* ---------------- DictionaryService ----------------
     Backed by the real VOCAB dataset — genuinely searches real
     content, not a mock. */
  const DictionaryService = {
    search(query){
      const q = (query||'').trim().toLowerCase();
      if(!q) return ok([], 'local');
      const results = VOCAB.filter(v =>
        v.de.toLowerCase().includes(q) || v.en.toLowerCase().includes(q) || (v.topic||'').includes(q)
      ).slice(0, 30);
      return ok(results, 'local');
    },
    get(id){
      const v = VOCAB.find(x=>x.id===id);
      return v ? ok(v, 'local') : unavailable('Word not found.');
    },
    /* Deterministic "word of the day" — same word all day for everyone,
       changes at midnight, no server round-trip needed. */
    wordOfDay(){
      const dayIndex = Math.floor(Date.now() / 86400000);
      const word = VOCAB[dayIndex % VOCAB.length];
      return ok(word, 'local');
    },
  };

  /* ---------------- ReadingService ---------------- */
  const ReadingService = {
    list(level){ return ok(level ? READING_TEXTS.filter(r=>r.level===level) : READING_TEXTS, 'local'); },
    get(id){
      const r = READING_TEXTS.find(x=>x.id===id);
      return r ? ok(r, 'local') : unavailable('Reading text not found.');
    },
  };

  /* ---------------- ListeningService ----------------
     No audio synthesis/playback pipeline exists in this build.
     Honest framing: transcript-based comprehension practice,
     clearly labelled 'demo' rather than pretending audio plays. */
  const ListeningService = {
    list(level){ return ok(level ? LISTENING_ITEMS.filter(l=>l.level===level) : LISTENING_ITEMS, 'demo'); },
    get(id){
      const l = LISTENING_ITEMS.find(x=>x.id===id);
      return l ? ok(l, 'demo') : unavailable('Listening item not found.');
    },
  };

  /* ---------------- WritingService ----------------
     Real prompts + a real, local word-count/heuristic check.
     Explicitly NOT claiming grammar correction — that needs a
     real language model backend, which isn't connected here. */
  const WritingService = {
    prompts(level){ return ok(level ? WRITING_PROMPTS.filter(p=>p.level===level) : WRITING_PROMPTS, 'local'); },
    submit(promptId, text){
      const prompt = WRITING_PROMPTS.find(p=>p.id===promptId);
      const wordCount = (text||'').trim().split(/\s+/).filter(Boolean).length;
      const meetsMin = prompt ? wordCount >= prompt.minWords : wordCount > 0;
      return ok({
        wordCount, meetsMin,
        note: 'Automatic grammar/style correction isn\u2019t connected yet in this build \u2014 this is a local word-count check only. Your text is saved to your local Writing history so you can compare drafts.',
      }, 'local');
    },
  };

  /* ---------------- ConversationService ----------------
     Fixed branching guided-dialogue script, not a free-form AI
     chat partner — framed that way in the UI, not as real AI. */
  const ConversationService = {
    scenarios(level){ return ok(level ? CONVERSATION_SCENARIOS.filter(c=>c.level===level) : CONVERSATION_SCENARIOS, 'local'); },
    get(id){
      const c = CONVERSATION_SCENARIOS.find(x=>x.id===id);
      return c ? ok(c, 'local') : unavailable('Scenario not found.');
    },
  };

  /* ---------------- SpeakingService / PronunciationService ----------------
     Real microphone recording UI is buildable client-side, but
     scoring pronunciation/fluency requires a real speech model —
     not present here. Every call is honestly unavailable. */
  const SpeakingService = {
    analyzeRecording(){ return unavailable('Speech analysis isn\u2019t connected in this build. Recording your voice for self-review works locally (see the Speaking Lab), but automatic scoring needs a future speech-processing backend.'); },
  };
  const PronunciationService = {
    analyzeRecording(){ return unavailable('Pronunciation scoring isn\u2019t connected in this build. Use the model audio text and record yourself to compare by ear for now.'); },
  };

  /* ---------------- TeacherService ----------------
     No AI backend is connected. Quick actions are real navigation
     shortcuts (they route to real local tools); free-text "ask
     anything" honestly reports that no AI is connected rather than
     returning a canned response dressed up as intelligence. */
  const TeacherService = {
    quickActions(){
      return ok([
        {id:'qa_grammar', label:'Explain grammar', route:'grammar'},
        {id:'qa_vocab', label:'Practice vocabulary', route:'vocab'},
        {id:'qa_writing', label:'Check my writing', route:'writing'},
        {id:'qa_speaking', label:'Practice speaking', route:'speaking'},
        {id:'qa_conversation', label:'Practice a conversation', route:'conversation'},
        {id:'qa_exam', label:'Prepare for an exam', route:'examprep'},
        {id:'qa_weak', label:'Practice my weak topics', route:'progress'},
      ], 'local');
    },
    ask(message){
      return unavailable('The Wegweiser Teacher chat isn\u2019t connected to a real AI backend yet in this build. Try one of the quick actions below \u2014 those route to real, working local tools instead of a simulated reply.');
    },
  };

  /* ---------------- VisionService / ScreenService ----------------
     Camera/screen-capture APIs could be requested from the browser,
     but no image-recognition or OCR backend exists here, so analysis
     is honestly unavailable even if camera access itself is granted. */
  const VisionService = {
    analyzeImage(){ return unavailable('German Vision needs an image-recognition backend that isn\u2019t connected in this build.'); },
  };
  const ScreenService = {
    analyzeScreen(){ return unavailable('Screen Assistant needs a text-recognition backend that isn\u2019t connected in this build.'); },
  };

  /* ---------------- ExamService ----------------
     Assembles a real mock section from the existing vetted content
     pools (GRAMMAR + LESSONS + PLACEMENT_TEST) rather than inventing
     new, unvetted exam questions or claiming official exam content. */
  const ExamService = {
    frameworks(){ return ok(EXAM_FRAMEWORKS, 'local'); },
    buildMockSection(level, section){
      let pool = [];
      if(section==='Grammatik & Wortschatz'){
        LESSONS.filter(l=>l.level===level).forEach(l=>pool.push(...l.exercises));
      } else if(section==='Lesen'){
        pool = READING_TEXTS.filter(r=>r.level===level);
      } else if(section==='Hören'){
        pool = LISTENING_ITEMS.filter(l=>l.level===level);
      } else {
        pool = []; // 'Schreiben' routes to WritingService prompts instead
      }
      return ok(pool.slice(0,8), 'local');
    },
  };

  /* ---------------- ChallengeService ---------------- */
  const ChallengeService = {
    today(stats){
      const results = CHALLENGE_DEFS.map(c => ({
        ...c,
        progress: Math.min(stats[c.metric]||0, c.target),
        complete: (stats[c.metric]||0) >= c.target,
      }));
      return ok(results, 'local');
    },
  };

  /* ---------------- AchievementService ---------------- */
  const AchievementService = {
    all(stats){
      const results = ACHIEVEMENT_DEFS.map(a => ({...a, unlocked: !!a.check(stats)}));
      return ok(results, 'local');
    },
  };

  /* ---------------- FeedbackService ---------------- */
  const FeedbackService = {
    async submit(entry){
      const rec = {id:'fb_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), ...entry, submittedAt:Date.now()};
      await DB.put('feedback', rec);
      return ok(rec, 'local');
    },
    async list(){
      const all = await DB.getAll('feedback');
      return ok(all.sort((a,b)=>b.submittedAt-a.submittedAt), 'local');
    },
  };

  /* ---------------- UpdateService ----------------
     Honest offline-first framing: there is no update server, so
     "checking" always truthfully reports the bundled local version. */
  const UpdateService = {
    check(){
      return ok({
        currentVersion:'1.0.0 (Phase 1 frontend)',
        upToDate:true,
        lastChecked:Date.now(),
        note:'This build has no update server connected \u2014 content ships bundled with the app. Checking always reflects the version you have installed.',
      }, 'local');
    },
  };

  /* ---------------- NotificationService ----------------
     Derived from real local state (due reviews, streak, challenges)
     — not simulated push notifications. */
  const NotificationService = {
    list(stats){
      const items = [];
      if((stats.due||0) > 0) items.push({id:'n_due', text:`${stats.due} word${stats.due===1?'':'s'} due for review`, route:'vocab'});
      if(stats.streak >= 3) items.push({id:'n_streak', text:`${stats.streak}-day streak \u2014 keep it going!`, route:'home'});
      if(stats.weakGroupLabel) items.push({id:'n_weak', text:`Practice ${stats.weakGroupLabel} in the Grammar Lab`, route:'grammar'});
      return ok(items, 'local');
    },
  };

  return {
    DictionaryService, ReadingService, ListeningService, WritingService, ConversationService,
    SpeakingService, PronunciationService, TeacherService, VisionService, ScreenService,
    ExamService, ChallengeService, AchievementService, FeedbackService, UpdateService, NotificationService,
  };
})();

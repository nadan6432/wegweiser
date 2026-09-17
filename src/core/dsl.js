/* ============================================================
   DSL — the content-authoring format (spec §53).

   Adding content must never require touching application logic.
   These parsers turn compact, hand-writable lines into full
   schema objects, which means a new lesson or 50 new words is a
   data edit, and the same renderer/engine picks them up.

   VOCABULARY LINES  (group supplies level + topic)
     n|Tisch|der|die Tische|table|Das Buch liegt auf dem Tisch.=The book is on the table.
     v|arbeiten|arbeite/arbeitest/arbeitet|hat gearbeitet|to work|Ich arbeite viel.=I work a lot.
     v|*aufstehen|...        ('*' marks a separable verb)
     v|!gehen|...            ('!' marks sein as the perfect auxiliary)
     a|groß|größer/am größten|big|Das Haus ist groß.=The house is big.
     w|immer|adv|always|Ich trinke immer Kaffee.=I always drink coffee.
     p|Guten Morgen|good morning|Guten Morgen, Frau Meier!=Good morning, Mrs Meier!
   Optional trailing segment  +key:value,key:value  adds metadata, e.g.
     +syn:sofort +opp:nie +mistake:...  +path:work,germany

   EXERCISE LINES
     mcq|cat|prompt|a;b;c;d|correct|explanation
     fill|cat|prompt|accept1;accept2|explanation
     build|cat|prompt|Ich komme aus Pakistan.|explanation      (words in correct order)
     match|cat|prompt|mit=with;nach=to|explanation
     correct|cat|wrong sentence|right sentence|explanation
     art|cat|Tisch|der|explanation                              -> mcq der/die/das
     conj|cat|prompt|answer|explanation                         -> fill
     trans|cat|English prompt|accept1;accept2|explanation       -> fill
     order|cat|prompt|Sentence in order.|explanation            -> build
     cat|cat|prompt|item=bucket;item=bucket|explanation         -> match
   ============================================================ */
const DSL = (() => {

  const S = (typeof Schema !== 'undefined') ? Schema : require('./schema.js');

  /* Deterministic (seeded) shuffle: same exercise always displays the same
     scrambled order across sessions/devices, but the order does not reveal
     the answer. A tiny string hash seeds a Fisher-Yates shuffle. */
  function seededRandom(seedStr){
    let h = 2166136261 >>> 0;
    for(let i=0;i<seedStr.length;i++){ h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619) >>> 0; }
    return function(){ h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  function deterministicShuffle(arr, seed){
    const a = arr.slice();
    const rnd = seededRandom(String(seed));
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rnd()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    /* Guard against the shuffle landing on the original order (common for
       short sentences), which would silently reveal the answer again. */
    if(a.length>1 && a.every((w,i)=>w===arr[i])){
      [a[0],a[a.length-1]] = [a[a.length-1],a[0]];
    }
    return a;
  }

  function ex(de, en){ return (de||en) ? [{de:de||'', en:en||''}] : []; }
  function splitEx(s){
    if(!s) return {de:'',en:''};
    const i = s.indexOf('=');
    return i<0 ? {de:s.trim(), en:''} : {de:s.slice(0,i).trim(), en:s.slice(i+1).trim()};
  }

  function parseExtras(parts){
    /* trailing "+key:value" segments */
    const out = {};
    parts.forEach(p=>{
      const m = /^\+([a-zA-Z]+):(.*)$/.exec(p.trim());
      if(!m) return;
      const key = m[1], val = m[2];
      const listKeys = {syn:'synonyms', opp:'opposites', rel:'related', col:'collocations',
                        phr:'phrases', path:'pathways', gram:'grammarIds', mistake:'commonMistakes'};
      if(listKeys[key]) out[listKeys[key]] = val.split(',').map(x=>x.trim()).filter(Boolean);
      else if(key==='freq') out.frequency = Number(val);
      else if(key==='sub') out.subtopic = val.trim();
      else if(key==='ur') out.translations = Object.assign(out.translations||{}, {ur:val.trim()});
      else if(key==='ps') out.translations = Object.assign(out.translations||{}, {ps:val.trim()});
      else out[key] = val.trim();
    });
    return out;
  }

  /* ---------------- vocabulary ---------------- */
  function vocab(level, topic, lines){
    const out = [];
    lines.forEach(line => {
      if(!line || !line.trim() || line.trim().startsWith('#')) return;
      const raw = line.split('|').map(x=>x.trim());
      const kind = raw[0];
      const extras = parseExtras(raw.filter(p=>p.startsWith('+')));
      const p = raw.filter(p=>!p.startsWith('+'));
      let v = null;

      if(kind==='n'){
        const [, word, article, plural, en, exs] = p;
        const e = splitEx(exs);
        v = {de:(article?article+' ':'')+word, lemma:word, article, plural:plural||'—', en,
             type:'noun', ex_de:e.de, ex_en:e.en, examples:ex(e.de,e.en)};
      } else if(kind==='v'){
        let [, inf, pres, perf, en, exs] = p;
        let sep=false, aux='haben';
        while(inf && (inf[0]==='*' || inf[0]==='!')){
          if(inf[0]==='*') sep=true; else aux='sein';
          inf = inf.slice(1);
        }
        const forms = (pres||'').split('/').map(x=>x.trim());
        const e = splitEx(exs);
        v = {de:inf, lemma:inf, en, type:'verb', ex_de:e.de, ex_en:e.en, examples:ex(e.de,e.en),
             forms:{praesens:{ich:forms[0]||'', du:forms[1]||'', er:forms[2]||''},
                    perfekt:perf||'', praeteritum:'', sep, aux}};
      } else if(kind==='a'){
        const [, word, comp, en, exs] = p;
        const c = (comp||'').split('/').map(x=>x.trim());
        const e = splitEx(exs);
        v = {de:word, lemma:word, en, type:'adj', ex_de:e.de, ex_en:e.en, examples:ex(e.de,e.en),
             forms:{comparative:c[0]||'', superlative:c[1]||''}};
      } else if(kind==='w'){
        const [, word, pos, en, exs] = p;
        const e = splitEx(exs);
        v = {de:word, lemma:word, en, type:pos||'adv', ex_de:e.de, ex_en:e.en, examples:ex(e.de,e.en)};
      } else if(kind==='p'){
        const [, word, en, exs] = p;
        const e = splitEx(exs);
        v = {de:word, lemma:word, en, type:'phrase', ex_de:e.de||word, ex_en:e.en||en, examples:ex(e.de,e.en)};
      } else {
        return; // unknown kind: skipped, the validator reports the count
      }

      v.level = level;
      v.topic = topic;
      v.id = S.ID_PREFIX.vocab + S.slug(v.lemma);
      Object.assign(v, extras);
      out.push(S.normalizeVocab(v));
    });
    return out;
  }

  /* ---------------- exercises ---------------- */
  const SUBTYPE_OF = {
    mcq:'multipleChoice', fill:'fillBlank', build:'sentenceBuilding', match:'matching',
    correct:'correction', art:'articleSelection', conj:'verbConjugation',
    trans:'translation', order:'ordering', cat:'categorization', read:'readingComprehension',
    dlg:'dialogueCompletion', short:'shortAnswer',
  };
  const SKILL_OF_SUBTYPE = {
    articleSelection:'grammar', verbConjugation:'grammar', translation:'vocabulary',
    readingComprehension:'reading', dialogueCompletion:'conversation', categorization:'vocabulary',
  };

  function exercise(line, ownerId, index, level, difficulty){
    const p = line.split('|').map(x=>x.trim());
    const kind = p[0];
    const category = p[1] || 'grammar';
    const id = S.ID_PREFIX.exercise + String(ownerId).replace(/^lsn_/,'') + '_' + (index+1);
    const base = {
      id, category, level, lessonId: ownerId,
      subtype: SUBTYPE_OF[kind] || 'multipleChoice',
      difficulty: difficulty || 'normal',
      tags: [category],
    };
    base.skill = SKILL_OF_SUBTYPE[base.subtype] ||
      (category==='vocab' ? 'vocabulary' : (category==='pronunciation' ? 'pronunciation' : 'grammar'));

    if(kind==='mcq' || kind==='read' || kind==='dlg'){
      return Object.assign(base, {type:'mcq', prompt:p[2], options:p[3].split(';').map(x=>x.trim()),
        correct:p[4], explain:p[5]||''});
    }
    if(kind==='art'){
      return Object.assign(base, {type:'mcq', prompt:`Which article belongs to „${p[2]}“?`,
        options:['der','die','das'], correct:p[3], explain:p[4]||''});
    }
    if(kind==='fill' || kind==='trans' || kind==='conj' || kind==='short'){
      return Object.assign(base, {type:'fill', prompt:p[2],
        accept:p[3].split(';').map(x=>x.trim()), explain:p[4]||''});
    }
    if(kind==='build' || kind==='order'){
      const correctOrder = p[3].split(/\s+/);
      const words = deterministicShuffle(correctOrder, id);
      return Object.assign(base, {type:'build', prompt:p[2], words, correctOrder, explain:p[4]||''});
    }
    if(kind==='match' || kind==='cat'){
      const pairs = p[3].split(';').map(seg=>{
        const [de,en] = seg.split('=');
        return {de:(de||'').trim(), en:(en||'').trim()};
      });
      return Object.assign(base, {type:'match', prompt:p[2], pairs, explain:p[4]||''});
    }
    if(kind==='correct'){
      return Object.assign(base, {type:'correct', prompt:p[2], wrong:p[2],
        accept:[p[3]], correctAnswer:p[3], explain:p[4]||''});
    }
    return null;
  }

  function exercises(lines, ownerId, level, difficulty){
    return (lines||[]).map((l,i)=>exercise(l, ownerId, i, level, difficulty)).filter(Boolean);
  }

  /* ---------------- teach blocks & sentence progression ---------------- */
  function teach(pairs){ return (pairs||[]).map(([h,p]) => ({h, p})); }
  function progression(title, steps){
    return { title, steps: (steps||[]).map(([de,en,note]) => ({de, en, note:note||''})) };
  }

  /* ---------------- curriculum builder ----------------
     A level pack declares units; each unit declares lessons in teaching
     order. Order, unit membership, prerequisite chaining and exercise IDs
     are all derived here, so authors never maintain them by hand. */
  function buildLevel(levelId, units){
    const lessons = [], unitRecords = [];
    let lessonOrder = 0;
    let prevLessonId = null;

    units.forEach((u, ui) => {
      const unitId = u.id || (S.ID_PREFIX.unit + levelId.toLowerCase() + '_' + String(ui+1).padStart(2,'0'));
      const lessonIds = [];

      (u.lessons||[]).forEach((raw, li) => {
        const id = raw.id || (S.ID_PREFIX.lesson + levelId.toLowerCase() + '_' +
                   String(ui+1).padStart(2,'0') + '_' + String(li+1).padStart(2,'0'));
        lessonOrder++;
        const prereq = raw.prereq || (prevLessonId ? [prevLessonId] : []);
        const lesson = S.normalizeLesson(Object.assign({}, raw, {
          id, level: levelId, unitId, order: lessonOrder, prereq,
          teach: raw.teach ? teach(raw.teach) : [],
          sentenceProgression: raw.prog ? progression(raw.prog[0], raw.prog.slice(1)) : null,
          exercises: exercises(raw.ex, id, levelId, raw.difficulty),
          vocabIds: raw.vocab || [],
          grammarId: raw.grammar || null,
          grammarIds: raw.grammar ? [raw.grammar] : (raw.grammars || []),
          readingIds: raw.reading ? [].concat(raw.reading) : [],
          writingIds: raw.writing ? [].concat(raw.writing) : [],
          listeningIds: raw.listening ? [].concat(raw.listening) : [],
          speakingIds: raw.speaking ? [].concat(raw.speaking) : [],
          conversationIds: raw.conversation ? [].concat(raw.conversation) : [],
          pack: levelId.toLowerCase(),
          estimatedMinutes: raw.time || 15,
        }));
        delete lesson.ex; delete lesson.prog; delete lesson.vocab; delete lesson.grammar;
        lessons.push(lesson);
        lessonIds.push(id);
        prevLessonId = id;
      });

      unitRecords.push({
        id: unitId, level: levelId, order: ui+1, title: u.title, theme: u.theme || u.title,
        goal: u.goal || '', canDo: u.canDo || [], lessonIds,
        pathways: u.pathways || ['everyday'], meta: S.meta(),
      });
    });

    return { level: levelId, units: unitRecords, lessons };
  }

  return { vocab, exercise, exercises, teach, progression, buildLevel, splitEx };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = DSL; }

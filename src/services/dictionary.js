/* ============================================================
   DICTIONARY SERVICE (Phase 4 — spec §14-20, §42-44)
   The universal, CEFR-independent dictionary layer: A-Z browsing,
   scored search (exact → translation → prefix → partial →
   inflected → fuzzy), and typo-tolerant suggestions. Deliberately
   separate from QueryService (which does a shallow cross-content
   search across vocab/grammar/lessons/reading for the global
   search box) — this file is the deep, vocabulary-specific engine
   the Dictionary screen needs.

   Performance note (spec §42/§49): the dataset here is low
   hundreds of records, so a memoized linear scan with early exits
   is genuinely fast enough — sub-millisecond per keystroke on any
   real device. The indexes below exist so that stays true as the
   dictionary grows toward a real A-Z lexicon, not because it's
   needed at 600 words today.
   ============================================================ */
const DictionaryService = (() => {
  const R = (typeof Repositories !== 'undefined') ? Repositories : require('../repositories/repositories.js');
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');

  /* ---------------- factory (Phase 9 §2) ----------------
     Everything below was written against a fixed data source
     (R.vocab(), the curated 705-entry array). Phase 9 needs a SECOND
     instance of the exact same search/browse engine running over the
     curated+master-lexicon pool instead, without touching this file's
     tested behavior for the default instance. createDictionaryService
     takes over what R.vocab() used to hard-code; every internal
     function below reads `getPool()` instead. The module still exports
     the original singleton, built with getPool = () => R.vocab(), so
     every existing caller and all pre-Phase-9 tests are unaffected. */
  function createDictionaryService(getPool, getExtraFormIndex){
  function norm(s){ return String(s||'').toLowerCase().trim(); }
  /* Unicode-safe normalization for Urdu/Pashto search (spec §5/§7): NFC
     composition so visually-identical strings compare equal regardless of
     how the combining marks were typed, plus stripping the OPTIONAL
     Arabic-script diacritics (harakat: fatha/kasra/damma/sukun/shadda/
     tanwin, U+064B–U+0652 and U+0670) that are rarely typed and don't
     change which letter is meant. This deliberately does NOT fold
     visually-similar-but-distinct letters (e.g. Arabic ي vs Persian/Urdu
     ی, or Pashto ښ/ږ/ړ/ڼ/ګ/ې/ۍ against their nearest Arabic relatives) —
     the phase spec explicitly warns against that, and getting it wrong
     would silently conflate different words rather than just missing a
     match, which is the worse failure mode. */
  function normUnicode(s){
    return String(s||'').normalize('NFC').replace(/[\u064B-\u0652\u0670]/g,'').replace(/\s+/g,' ').trim();
  }
  /* Strip the leading article for alphabetising/searching "der Tisch" as
     "Tisch" — but the UI must still render the full "der Tisch" (spec §6:
     never invent an article for a word type that doesn't have one, and
     never drop the one a noun DOES have from the display). This never
     touches v.de itself, only a value used for matching/sorting. */
  function stripArticle(s){ return norm(s).replace(/^(der|die|das)\s+/,''); }
  /* Bucketing letter for A-Z browsing: ä/ö/ü sort under their base letter
     (as German dictionaries and phone books conventionally do), while the
     display string keeps the real character (spec §7: Straße/Mädchen must
     never be rewritten — only this bucketing key is folded, nothing is
     stored or displayed in folded form).

     Article-stripping only applies to nouns: "das Haus" buckets under H,
     but a phrase like "Das kommt darauf an." is a full sentence whose
     first word genuinely is "Das" — stripping it would silently bucket
     the phrase under K (Phase 9 testing surfaced this once phrases/idioms
     were added to the pool at scale; fixed here for every caller, curated
     content included). */
  function bucketLetter(s, wordType){
    const base = wordType==='noun' ? stripArticle(s) : norm(s);
    const c = base.charAt(0).toUpperCase();
    return ({'Ä':'A','Ö':'O','Ü':'U'})[c] || c || '#';
  }

  /* ---------------- memoized indexes ----------------
     VOCAB is mutated in place by Registry.apply() once at boot and not
     touched again afterward, so a cache keyed on array length + first/last
     id is enough to detect "the underlying data changed" without paying
     for a rebuild on every keystroke. */
  let _azCache = null;
  function buildIndex(){
    const vocab = getPool();
    const key = vocab.length + '|' + (vocab[0]&&vocab[0].id) + '|' + (vocab[vocab.length-1]&&vocab[vocab.length-1].id);
    if(_azCache && _azCache.key===key) return _azCache;
    const byLetter = {};
    vocab.forEach(v=>{
      const letter = bucketLetter(v.de, (typeof S!=='undefined'?S.canonicalWordType(v.type):v.type));
      (byLetter[letter] = byLetter[letter] || []).push(v);
    });
    Object.keys(byLetter).forEach(l=> byLetter[l].sort((a,b)=> stripArticle(a.de).localeCompare(stripArticle(b.de),'de')));
    _azCache = { key, byLetter, letters: Object.keys(byLetter).sort() };
    return _azCache;
  }

  function availableLetters(){ return buildIndex().letters; }
  function browseLetter(letter, opts){
    const idx = buildIndex();
    let list = idx.byLetter[letter.toUpperCase()] || [];
    list = applyFilters(list, opts);
    return list;
  }

  function applyFilters(list, opts){
    if(!opts) return list;
    if(opts.wordType) list = list.filter(v=>S.canonicalWordType(v.type)===opts.wordType);
    if(opts.level) list = list.filter(v=>v.level===opts.level);
    if(opts.topic) list = list.filter(v=>(v.topicTags||[v.topic]).includes(opts.topic));
    if(opts.gender) list = list.filter(v=>v.article===opts.gender);
    return list;
  }

  /* ---------------- multilingual search index (spec §6) ----------------
     ONE precomputed, normalized record per vocabulary entry, built from
     the vocabulary source of truth (VOCAB) — not a second, manually
     maintained database. Every search tier below reads from this instead
     of re-normalizing raw fields on every keystroke, which both fixes the
     "search only matches German/English" gap (Urdu/Pashto are now first-
     class fields here) and is the actual performance improvement the
     phase asked for. */
  let _searchCache = null;
  function buildSearchIndex(){
    const az = buildIndex(); // shares the same cache-key/staleness check
    if(_searchCache && _searchCache.key===az.key) return _searchCache;
    const entries = getPool().map(v=>({
      v,
      de: stripArticle(v.de),
      lemma: norm(v.lemma),
      en: norm(v.en).split(/[,;/]/).map(s=>s.trim()).filter(Boolean),
      ur: (v.translations && v.translations.ur) ? [normUnicode(v.translations.ur)] : [],
      ps: (v.translations && v.translations.ps) ? [normUnicode(v.translations.ps)] : [],
      related: [].concat(v.synonyms||[], v.collocations||[]).map(norm),
    }));
    _searchCache = { key: az.key, entries };
    return _searchCache;
  }

  /* ---------------- typo tolerance ----------------
     Classic Levenshtein edit distance, capped early once a row exceeds
     the allowed distance — this keeps fuzzy suggestions cheap even
     though it's O(n*m) per candidate, because both strings here are
     always short (single words, not sentences). */
  function levenshtein(a, b, maxDist){
    a = norm(a); b = norm(b);
    if(Math.abs(a.length-b.length) > maxDist) return maxDist+1;
    const m = a.length, n = b.length;
    let prev = new Array(n+1);
    for(let j=0;j<=n;j++) prev[j]=j;
    for(let i=1;i<=m;i++){
      const cur = [i];
      let rowMin = i;
      for(let j=1;j<=n;j++){
        const cost = a[i-1]===b[j-1] ? 0 : 1;
        cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+cost);
        if(cur[j]<rowMin) rowMin = cur[j];
      }
      if(rowMin > maxDist) return maxDist+1; // early exit: whole row already too far
      prev = cur;
    }
    return prev[n];
  }

  /* ---------------- inflected-form lookup ----------------
     Real architecture (a surface-form → lemma index), populated
     progressively and honestly — see spec §20/§44 ("this is not a full
     morphological analyzer, and must never be presented as one"). Every
     entry below is a linguistically checked, high-frequency irregular
     form that resolves to a lemma that actually exists in VOCAB; nothing
     is auto-generated. Grouped by lemma (rather than one flat list) so
     the shape can grow toward a real `lemma -> inflections[]` structure
     without a breaking change — INFLECTIONS_BY_LEMMA is the structured
     form; IRREGULAR_FORMS (surface form -> lemma) is derived from it. */
  const INFLECTIONS_BY_LEMMA = {
    gehen: ['ging','gingst','gingen','gegangen','gehst','geht'],
    kommen: ['kam','kamst','kamen','gekommen'],
    sein: ['war','warst','waren','gewesen'],
    haben: ['hatte','hattest','hatten','gehabt'],
    sprechen: ['sprach','sprachst','gesprochen','spricht','sprichst'],
    nehmen: ['nahm','nahmst','genommen','nimmt','nimmst'],
    geben: ['gab','gabst','gegeben','gibt','gibst'],
    sehen: ['sah','sahst','gesehen','sieht','siehst'],
    essen: ['aß','aßt','gegessen','isst'],
    trinken: ['trank','getrunken'],
    fahren: ['fuhr','gefahren','fährt','fährst'],
    laufen: ['lief','gelaufen','läuft','läufst'],
    schreiben: ['schrieb','geschrieben'],
    lesen: ['las','gelesen','liest'],
    finden: ['fand','gefunden'],
    wissen: ['wusste','gewusst','weiß'],
    denken: ['dachte','gedacht'],
    bringen: ['brachte','gebracht'],
    bleiben: ['blieb','geblieben'],
    helfen: ['half','geholfen','hilft','hilfst'],
    werden: ['wurde','geworden','wird','wirst'],
    haus: ['häuser','hauses','häusern'],
    kind: ['kinder','kindes','kindern'],
    mann: ['männer','mannes','männern'],
    buch: ['bücher','buches','büchern'],
    glas: ['gläser','glases','gläsern'],
    wort: ['wörter','wortes','wörtern'],
    land: ['länder','landes','ländern'],
    groß: ['größer','größte'],
    gut: ['besser','beste'],
    viel: ['mehr','meiste'],
    gern: ['lieber','liebste'],
    alt: ['älter','älteste'],
    hoch: ['höher','höchste'],
  };
  const IRREGULAR_FORMS = (() => {
    const map = {};
    Object.keys(INFLECTIONS_BY_LEMMA).forEach(lemma=>{
      INFLECTIONS_BY_LEMMA[lemma].forEach(form=>{ map[norm(form)] = lemma; });
    });
    return map;
  })();
  function lookupInflected(term){
    const key = norm(term);
    const lemma = IRREGULAR_FORMS[key];
    const results = [];
    const seenIds = new Set();
    const push = (v) => { if(v && !seenIds.has(v.id)){ seenIds.add(v.id); results.push(v); } };
    if(lemma){
      // Match by lemma OR by the bare headword (covers both verb infinitives
      // authored as `lemma` and nouns/adjectives authored as plain `de`).
      getPool().filter(v => norm(v.lemma)===lemma || stripArticle(v.de)===lemma).forEach(push);
    }
    // Phase 9: the master lexicon's own real, per-word surfaceForms index
    // (e.g. Wiktextract-sourced conjugation/declension data) — a second,
    // independently-populated source of the same "surface form -> lemma"
    // relationship, additive to the curated IRREGULAR_FORMS table above,
    // never overriding it.
    if(typeof getExtraFormIndex === 'function'){
      const idx = getExtraFormIndex();
      const extra = idx && idx.get ? idx.get(key) : null;
      if(extra) extra.forEach(push);
    }
    return results;
  }

  /* ---------------- scored search ----------------
     Ranking (spec §10, deterministic): exact German lemma → exact
     inflected form → exact translation (EN/UR/PS together) → German
     prefix → translation prefix → partial German match → related
     searchable form (synonyms/collocations) → fuzzy suggestion. Never
     reordered by the learner's mastery or CEFR level — a dictionary is a
     neutral lookup tool; personalization is a separate layer (see
     LearningService), not a search-ranking input. */
  function search(term, opts){
    const q = norm(term);
    const qUnicode = normUnicode(term);
    const empty = {query:term, exact:[], inflected:[], translationExact:[], prefix:[], translationPrefix:[], partial:[], related:[], fuzzy:[]};
    if(!q && !qUnicode) return empty;

    const idx = buildSearchIndex();
    const allowedIds = opts ? new Set(applyFilters(getPool(), opts).map(v=>v.id)) : null;
    const pool = allowedIds ? idx.entries.filter(e=>allowedIds.has(e.v.id)) : idx.entries;

    const seen = new Set();
    const bucket = (arr, e) => { if(!seen.has(e.v.id)){ seen.add(e.v.id); arr.push(e.v); } };
    const matchesUnicode = (list, needle) => needle && list.some(s=>s===needle);

    const exact=[], inflected=[], translationExact=[], prefix=[], translationPrefix=[], partial=[], related=[];

    // 1. Exact German lemma
    pool.forEach(e=>{ if(e.de===q || e.lemma===q){ bucket(exact, e); } });
    // 2. Exact inflected form
    lookupInflected(q).forEach(v=>{ if(!seen.has(v.id)){ seen.add(v.id); inflected.push(v); } });
    // 3. Exact translation — German+English via `q`, Urdu/Pashto via `qUnicode`
    pool.forEach(e=>{
      if(seen.has(e.v.id)) return;
      if(e.en.includes(q) || matchesUnicode(e.ur, qUnicode) || matchesUnicode(e.ps, qUnicode)) bucket(translationExact, e);
    });
    // 4. German prefix
    pool.forEach(e=>{ if(!seen.has(e.v.id) && q && e.de.startsWith(q)) bucket(prefix, e); });
    // 5. Translation prefix (English only — Urdu/Pashto prefix matching on
    //    a handful of curated words isn't reliable enough to rank yet; a
    //    real Urdu/Pashto entry is still found via exact/partial tiers).
    pool.forEach(e=>{ if(!seen.has(e.v.id) && q && e.en.some(en=>en.startsWith(q))) bucket(translationPrefix, e); });
    // 6. Partial German / English / Urdu / Pashto match anywhere in the string
    pool.forEach(e=>{
      if(seen.has(e.v.id)) return;
      const hit = (q && (e.de.includes(q) || e.en.some(en=>en.includes(q))))
        || (qUnicode && (e.ur.some(u=>u.includes(qUnicode)) || e.ps.some(p=>p.includes(qUnicode))));
      if(hit) bucket(partial, e);
    });
    // 7. Related searchable form (synonyms/collocations)
    pool.forEach(e=>{ if(!seen.has(e.v.id) && q && e.related.some(r=>r.includes(q))) bucket(related, e); });

    // 8. Fuzzy — only when nothing else matched, and only against German
    //    (typo tolerance for Urdu/Pashto script isn't attempted here).
    let fuzzy = [];
    const foundSoFar = exact.length+inflected.length+translationExact.length+prefix.length+translationPrefix.length+partial.length+related.length;
    if(foundSoFar===0 && q.length>=3){
      const maxDist = q.length<=4 ? 1 : 2;
      pool.forEach(e=>{
        const d = levenshtein(e.de, q, maxDist);
        if(d<=maxDist) fuzzy.push({item:e.v, distance:d});
      });
      fuzzy.sort((a,b)=>a.distance-b.distance);
      fuzzy = fuzzy.slice(0,5).map(f=>f.item);
    }

    return {query:term, exact, inflected, translationExact, prefix, translationPrefix, partial, related, fuzzy};
  }

  function totalResultCount(res){
    return res.exact.length+res.inflected.length+res.translationExact.length+res.prefix.length
      +res.translationPrefix.length+res.partial.length+res.related.length;
  }

  return { availableLetters, browseLetter, search, totalResultCount, levenshtein,
    stripArticle, bucketLetter, normUnicode, lookupInflected, IRREGULAR_FORMS, INFLECTIONS_BY_LEMMA,
    buildSearchIndex };
  } // end createDictionaryService

  return Object.assign(createDictionaryService(() => R.vocab()), { create: createDictionaryService });
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = DictionaryService; }

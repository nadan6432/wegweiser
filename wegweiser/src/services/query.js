/* ============================================================
   CONTENT QUERY SERVICE (spec: content search across the graph)
   One search function across vocabulary, grammar, lessons and
   reading texts — no separate search index needed at this
   content scale (low hundreds to low thousands of records);
   a simple scored linear scan is fast enough and easy to audit.
   ============================================================ */
const QueryService = (() => {
  const R = (typeof Repositories !== 'undefined') ? Repositories : require('../repositories/repositories.js');

  function norm(s){ return String(s||'').toLowerCase(); }

  function search(term, opts){
    const q = norm(term);
    if(!q) return { vocab:[], grammar:[], lessons:[], reading:[] };
    const limit = (opts&&opts.limit) || 20;

    const vocabHits = R.vocab().filter(v=>norm(v.de).includes(q) || norm(v.en).includes(q)).slice(0,limit);
    const grammarHits = R.grammar().filter(g=>norm(g.title).includes(q) || norm(g.explanation).includes(q)).slice(0,limit);
    const lessonHits = R.lessons().filter(l=>norm(l.title).includes(q) || norm(l.goal).includes(q)).slice(0,limit);
    const readingHits = ((typeof READING_TEXTS!=='undefined')?READING_TEXTS:[]).filter(r=>norm(r.title).includes(q)).slice(0,limit);

    return { vocab: vocabHits, grammar: grammarHits, lessons: lessonHits, reading: readingHits };
  }

  return { search };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = QueryService; }

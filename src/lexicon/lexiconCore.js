/* ============================================================
   LEXICON CORE (Phase 13) — pure, environment-independent logic.
   Normalisation, index-row building, the in-memory test backend and
   the ranked SearchEngine. Nothing here touches IndexedDB, the DOM or
   fetch, so the exact same ranking code runs in Node (tests, against
   the real 92,880-lemma dataset) and in the browser (against IndexedDB
   via src/lexicon/lexiconStore.js).

   Design rule: stored lemmas are NEVER case-folded or rewritten. Folded /
   transliterated keys are *derived index fields* (_k, _kt, ...) stored next to
   the untouched record, so `Frau` (noun) and `frau` (pronoun) stay distinct.
   ============================================================ */
'use strict';
(function(root){

const nfc = s => String(s == null ? '' : s).normalize('NFC');
const fold = s => nfc(s).trim().toLowerCase();
/* ae/oe/ue/ss equivalents — a TRANSLITERATION of stored words, not a diacritic
   strip: "schon" never matches "schön" (distinct words), but "schoen" does. */
const translit = s => fold(s).replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
/* Same Arabic-script normalisation the Phase 4 dictionary used (NFC, drop optional
   harakat, collapse spaces); does NOT fold look-alike letters. */
const normUnicode = s => nfc(s).replace(/[\u064B-\u0652\u0670]/g,'').replace(/\s+/g,' ').trim();

function parseQuery(raw){
  const q = nfc(raw).replace(/\s+/g,' ').trim();
  const m = q.match(/^(der|die|das)\s+(\S.*)$/i);
  const term = m ? m[2] : q;
  return { q, fold: fold(q), article: m ? m[1].toLowerCase() : null, term, termFold: fold(term) };
}

/* ---- data-defect guard (found in Phase 12 data, see PHASE13_REPORT.md §3) ----
   Wiktextract table/template markers leaked into `surfaceForms`:
   de-ndecl (54,756 lemmas), no-table-tags (37,555), strong (26,409), de-adecl,
   de-conj, weak, neuter, ... plus the auxiliary markers `haben`/`sein` attached to
   ~10k verbs. They are NOT inflected forms; indexing them made `strong` resolve
   to 26k nouns. The stored records are left untouched; these tokens are simply
   never put into the form index. */
const FORM_BLOCK = new Set(['de-ndecl','de-adecl','de-conj','no-table-tags','strong','weak','mixed',
  'neuter','feminine','masculine','irregular','present','glossary','l-self','g']);
const isTemplateToken = k => FORM_BLOCK.has(k) || /^de-[a-z0-9-]+$/.test(k);

function usableForm(rawForm, lemmaFold, rec){
  if(typeof rawForm !== 'string') return null;
  const k = fold(rawForm);
  if(!k || /\s/.test(k) || k === lemmaFold) return null;      // multi-word forms are resolved by verification, see SearchEngine
  if(isTemplateToken(k)) return null;
  if((k === 'haben' || k === 'sein') && rec.wordType === 'verb') return null; // auxiliary marker, not a form
  return k;
}
function glossKeys(rec){
  const en = (rec.translations && rec.translations.en && rec.translations.en.length) ? rec.translations.en.join('; ') : (rec.meanings || []).join('; ');
  const out = new Set();
  String(en).toLowerCase().split(/[,;/]/).forEach(s => { s = s.trim(); if(s && s.length <= 80) out.add(s); });
  return Array.from(out).slice(0, 24);
}
function xlKeys(rec){
  const out = new Set(), t = rec.translations || {};
  [t.ur, t.ps].forEach(arr => (arr || []).forEach(s => {
    const whole = normUnicode(String(s)); if(whole) out.add(whole);
    whole.split(/[;\u061B,\u060C]/).forEach(p => { p = p.trim(); if(p) out.add(p); });
  }));
  return Array.from(out).slice(0, 12);
}
/* One multiEntry IndexedDB index (`i` on `_i`) holds every lookup key, prefixed by kind. Measured in
   Chromium: write cost is dominated by index ENTRIES, and each extra index adds fixed per-row overhead, so
   a single combined index with only the entries search really needs is the cheapest persistent layout.
     l:<Lemma as stored>   case-sensitive lemma          k:<folded lemma>   case-insensitive lemma
     t:<ae/oe/ue/ss lemma> only when different           f:<folded form>    single-word inflected form
     u:<ae/oe/ue/ss form>  only when different           g:<gloss>          English gloss (split on , ; /)
     x:<segment>           Urdu / Pashto segment
   Substring ("partial") search does NOT use per-trigram entries (that was >50% of all entries); it scans
   the compact key projection instead (see backend.partial). */
const KIND = { lemma:'l', k:'k', kt:'t', f:'f', ft:'u', g:'g', x:'x' };
const ikey = (name, key) => KIND[name] + ':' + key;

function toRow(rec, counters){
  const row = Object.assign({}, rec);
  const k = fold(rec.lemma);
  const ks = new Set(['l:' + rec.lemma, 'k:' + k]);
  row._k = k;
  const kt = translit(rec.lemma); if(kt !== k) ks.add('t:' + kt);
  (rec.surfaceForms || []).forEach(raw => {
    const u = usableForm(raw, k, rec);
    if(u === null){ if(counters && typeof raw === 'string'){ const kk = fold(raw); if(isTemplateToken(kk) || kk==='haben' || kk==='sein') counters[kk] = (counters[kk]||0)+1; } return; }
    ks.add('f:' + u); const t = translit(u); if(t !== u) ks.add('u:' + t);
  });
  glossKeys(rec).forEach(g => ks.add('g:' + g));
  xlKeys(rec).forEach(x => ks.add('x:' + x));
  row._i = Array.from(ks);
  return row;
}

/* true iff a and b differ by exactly one insertion, deletion, substitution or adjacent transposition */
function edit1(a, b){
  const la = a.length, lb = b.length; if(Math.abs(la - lb) > 1) return false;
  let i = 0; while(i < la && i < lb && a[i] === b[i]) i++;
  if(i === la && i === lb) return false;
  if(la === lb) return a.slice(i + 1) === b.slice(i + 1) || (i + 1 < la && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return la > lb ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

/* ---------------- in-memory backend (Node tests; same contract as the IndexedDB backend) -------------- */
function MemoryBackend(){
  const rows = new Map(), idx = new Map(); let sorted = null;
  const stats = { rowsRead: 0, lookups: 0 };
  const meta = new Map();
  const sortedKeys = () => sorted || (sorted = Array.from(idx.keys()).sort());
  const lowerBound = (arr, key) => { let lo = 0, hi = arr.length; while(lo < hi){ const m = (lo+hi)>>1; if(arr[m] < key) lo = m+1; else hi = m; } return lo; };
  const be = {
    stats, kind: 'memory',
    async putMany(batch){ batch.forEach(r => { if(rows.has(r.id)) be._unindex(rows.get(r.id)); rows.set(r.id, r); r._i.forEach(k => { if(!idx.has(k)) idx.set(k, []); idx.get(k).push(r.id); }); }); sorted = null; },
    _unindex(r){ r._i.forEach(k => { const a = idx.get(k); if(a){ const i = a.indexOf(r.id); if(i >= 0) a.splice(i, 1); if(!a.length) idx.delete(k); } }); },
    async clear(){ rows.clear(); idx.clear(); sorted = null; meta.clear(); },
    async count(){ return rows.size; },
    async get(id){ const r = rows.get(id) || null; if(r) stats.rowsRead++; return r; },
    async getMany(ids){ return ids.map(i => rows.get(i)).filter(Boolean).map(r => { stats.rowsRead++; return r; }); },
    async lookup(n, key, o){ o = o || {}; stats.lookups++; const out = [];
      for(const id of (idx.get(ikey(n, key)) || []).slice().sort()){ const r = rows.get(id); stats.rowsRead++; if(!o.predicate || o.predicate(r)){ out.push(r); if(o.limit && out.length >= o.limit) break; } } return out; },
    async countRange(n, lo, hi){ const a = sortedKeys(); const L = ikey(n, lo), H = ikey(n, hi); let c = 0; for(let i = lowerBound(a, L); i < a.length && a[i] < H; i++) c += idx.get(a[i]).length; return c; },
    async scan(n, o){ const a = sortedKeys(); const L = ikey(n, o.lo), H = ikey(n, o.hi); let skip = o.skip || 0, scanned = 0; const out = []; const cap = o.scanCap || 1e9;
      for(let i = lowerBound(a, L); i < a.length && a[i] < H; i++){
        for(const id of idx.get(a[i]).slice().sort()){
          const r = rows.get(id); scanned++; stats.rowsRead++;
          if(!o.predicate || o.predicate(r)){ if(skip > 0) skip--; else { out.push(r); if(out.length >= o.limit) return { rows: out, scanned, done: false }; } }
          if(scanned >= cap) return { rows: out, scanned, done: false, capped: true };
        } }
      return { rows: out, scanned, done: true }; },
    /* substring candidates from the key projection only (no record is read): [{id, pos, len}] best first */
    async partial(sub, cap){ const out = []; for(const r of rows.values()){ const p = r._k.indexOf(sub); if(p >= 0) out.push({ id: r.id, pos: p, len: r._k.length }); }
      return out.sort((a, b) => (a.pos - b.pos) || (a.len - b.len) || (a.id < b.id ? -1 : 1)).slice(0, cap); },
    async fuzzy(w, cap){ const out = []; for(const r of rows.values()){ if(edit1(w, r._k)){ out.push({ id: r.id, len: r._k.length }); if(out.length >= cap) break; } } return out; },
    async getMeta(k){ return meta.has(k) ? meta.get(k) : null; },
    async setMeta(k, v){ meta.set(k, v); },
  };
  return be;
}

/* ---------------- ranking ---------------- */
const WT_RANK = { noun:0, verb:1, adjective:2, adverb:3, phrase:4, idiom:4, preposition:5, pronoun:5, article:5, determiner:5, conjunction:5, subjunction:5, particle:5, interjection:5, number:5, modal_particle:5, proper_noun:6, unknown:7 };
const wtRank = w => (WT_RANK[w] === undefined ? 5 : WT_RANK[w]);
const cmpRows = (a, b) => (wtRank(a.wordType) - wtRank(b.wordType)) || (a.lemma.length - b.lemma.length) || (a._k < b._k ? -1 : a._k > b._k ? 1 : 0) || (a.lemma < b.lemma ? -1 : a.lemma > b.lemma ? 1 : 0) || (a.id < b.id ? -1 : 1);
const TIER_ORDER = ['exact','ci','inflected','variant','translationExact','prefix','translationPrefix','partial','fuzzy'];

function makeFilter(f, canon){
  if(!f || !(f.wordType || f.level || f.gender || f.topic)) return null;
  canon = canon || (x => x);
  return r => (!f.wordType || canon(r.wordType) === f.wordType) && (!f.level || (r.cefr || 'unknown') === f.level)
    && (!f.gender || r.article === f.gender) && (!f.topic || r.domain === f.topic);
}

/* ---------------- SearchEngine ----------------
   Tier order (deterministic; never personalised):
     exact (case-sensitive lemma) -> ci (case-insensitive lemma) -> inflected (exact surface form)
     -> variant (ae/oe/ue/ss spelling) -> translationExact -> prefix -> translationPrefix
     -> partial (substring, key-projection scan) -> fuzzy (edit distance 1, only when nothing else matched)
   Every tier is fetched lazily and only until `offset+limit+1` results exist, so a
   query for `gehen` never touches the substring/prefix tiers' long tails. */
function SearchEngine(backend, opts){
  opts = opts || {};
  const canon = opts.canonicalWordType;
  const rowHasForm = (row, f) => (row.surfaceForms || []).some(s => typeof s === 'string' && fold(s) === f);

  async function search(raw, o){
    o = o || {};
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const rr0 = backend.stats.rowsRead;
    const limit = o.limit || 30, offset = o.offset || 0, want = offset + limit + 1;
    const P = parseQuery(raw);
    const res = { query: raw, parsed: P, items: [], hasMore: false, offset, limit, truncated: false, stats: {} };
    if(!P.fold){ return res; }
    const pred = makeFilter(o.filters, canon);
    const seen = new Set(), items = [];
    const stale = () => o.isStale && o.isStale();
    const add = (rows, tier, extra) => { for(const r of rows){ if(seen.has(r.id)) continue; seen.add(r.id); items.push(Object.assign({ row: r, tier }, extra || {})); } };
    const full = () => items.length >= want;
    const hasArticle = !!P.article;

    // 1. exact + case-insensitive lemma
    let ex = await backend.lookup('lemma', P.q, { predicate: pred, limit: 50 });
    add(ex.sort(cmpRows), 'exact');
    if(hasArticle){
      const rows = (await backend.lookup('k', P.termFold, { predicate: pred, limit: 50 })).sort(cmpRows);
      const good = rows.filter(r => r.wordType === 'noun' && r.article === P.article);
      add(good, 'exact');
      add(rows.filter(r => !good.includes(r)), 'ci', { articleMismatch: true });
    } else if(!full() && !stale()){
      add((await backend.lookup('k', P.fold, { predicate: pred, limit: 50 })).sort(cmpRows), 'ci');
    }
    // 2. inflected — exact single-word form; multi-word forms ("habe abgebaut") are resolved by verification
    if(!full() && !stale()){
      const key = hasArticle ? P.termFold : P.fold;
      const multi = /\s/.test(key);
      const lookKey = multi ? key.split(' ').pop() : key;
      let rows = await backend.lookup('f', lookKey, { predicate: pred, limit: multi ? 400 : 60 });
      if(multi) rows = rows.filter(r => rowHasForm(r, key));
      add(rows.sort(cmpRows), 'inflected');
      if(multi && !rows.length){
        // multi-word form whose last token equals the lemma-less participle is not indexed; try each token
        for(const tok of key.split(' ')){
          const cand = (await backend.lookup('k', tok, { predicate: pred, limit: 20 })).concat(await backend.lookup('f', tok, { predicate: pred, limit: 60 }));
          add(cand.filter(r => rowHasForm(r, key)).sort(cmpRows), 'inflected');
        }
      }
    }
    // 3. transliteration variants (Strasse -> Straße, Haeuser -> Häuser). Different words are never merged:
    //    only an exact match against the stored ae/oe/ue/ss spelling counts.
    if(!full() && !stale()){
      const key = hasArticle ? P.termFold : P.fold;
      if(/ae|oe|ue|ss/.test(key)){
        add((await backend.lookup('kt', key, { predicate: pred, limit: 30 })).sort(cmpRows), 'variant');
        if(!full()) add((await backend.lookup('ft', key, { predicate: pred, limit: 30 })).sort(cmpRows), 'variant');
      }
    }
    // 4. exact translation (English glosses; Urdu/Pashto strings)
    if(!full() && !stale() && !hasArticle){
      const rows = (await backend.lookup('g', P.fold, { predicate: pred, limit: 60 })).concat(await backend.lookup('x', normUnicode(P.q), { predicate: pred, limit: 30 }));
      add(rows.sort(cmpRows), 'translationExact');
    }
    // 5. prefix on lemma
    const pf = P.termFold;
    if(!full() && !stale()){
      const r = await backend.scan('k', { lo: pf, hi: pf + '\uffff', predicate: pred, limit: 150, scanCap: 6000 });
      let rows = r.rows.sort((a, b) => (hasArticle ? ((b.article === P.article) - (a.article === P.article)) : 0) || cmpRows(a, b));
      if(!r.done) res.truncated = true;
      add(rows, 'prefix');
    }
    // 6. prefix on translation
    if(!full() && !stale() && !hasArticle){
      const r = await backend.scan('g', { lo: P.fold, hi: P.fold + '\uffff', predicate: pred, limit: 100, scanCap: 3000 });
      add(r.rows.sort(cmpRows), 'translationPrefix');
    }
    // 7. partial (substring) — scans the compact key projection (ids + folded lemmas), never the records;
    //    only the best `want` candidates are then fetched as full records.
    if(!full() && !stale() && pf.length >= 3){
      const cands = await backend.partial(pf, 600);
      if(cands.length >= 600) res.truncated = true;
      const fresh = cands.filter(c => !seen.has(c.id)).slice(0, Math.max(want * 2, 60));
      const rows = (await backend.getMany(fresh.map(c => c.id))).filter(r => !pred || pred(r));
      const order = new Map(fresh.map((c, i) => [c.id, i]));
      add(rows.sort((a, b) => order.get(a.id) - order.get(b.id)), 'partial');
    }
    // 8. typo tolerance (edit distance 1: one insertion/deletion/substitution/transposition) — only when NOTHING
    //    else matched, so it can never bury a real result. One pass over the key projection, no per-candidate lookups.
    if(!items.length && !stale() && pf.length >= 3 && pf.length <= 20){
      const cands = await backend.fuzzy(pf, 40);
      if(cands.length){
        const rows = (await backend.getMany(cands.map(c => c.id))).filter(r => !pred || pred(r));
        add(rows.sort(cmpRows).slice(0, 5), 'fuzzy');
      }
    }
    res.items = items.slice(offset, offset + limit);
    res.hasMore = items.length > offset + limit;
    res.stats = { ms: +((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0).toFixed(1), rowsRead: backend.stats.rowsRead - rr0, returned: res.items.length };
    return res;
  }

  /* A–Z browsing through the lemma index, paged with offset/limit. Umlaut letters share their base letter's page. */
  async function browse(letter, o){
    o = o || {};
    const L = String(letter || '').toLowerCase();
    const ranges = [[L, L + '\uffff']]; const um = { a:'ä', o:'ö', u:'ü' }[L]; if(um) ranges.push([um, um + '\uffff']);
    const pred = makeFilter(o.filters, canon), limit = o.limit || 40; let skip = o.offset || 0; const rows = []; let more = false;
    for(const [lo, hi] of ranges){
      const r = await backend.scan('k', { lo, hi, predicate: pred, limit: limit - rows.length + 1, skip, scanCap: 20000 });
      if(!pred){ // skip applies per range when unfiltered; recompute remaining skip from the range size
        const n = await backend.countRange('k', lo, hi); skip = Math.max(0, skip - n);
      } else skip = 0;
      rows.push(...r.rows); if(rows.length > limit){ more = true; break; }
    }
    const page = rows.slice(0, limit);
    let total = null; if(!pred){ total = 0; for(const [lo, hi] of ranges) total += await backend.countRange('k', lo, hi); }
    return { letter: L.toUpperCase(), items: page, hasMore: more, total, offset: o.offset || 0, limit };
  }

  /* Reading-tap resolution: lemma (as typed) -> case-insensitive lemma -> inflected. Returns a row or null; never invents. */
  async function resolveWord(word){
    const P = parseQuery(word); if(!P.fold) return null;
    let rows = await backend.lookup('lemma', P.q, { limit: 20 });
    if(!rows.length) rows = await backend.lookup('k', P.fold, { limit: 20 });
    if(!rows.length) rows = await backend.lookup('f', P.fold, { limit: 40 });
    return rows.sort(cmpRows)[0] || null;
  }
  return { search, browse, resolveWord };
}

const api = { nfc, fold, translit, normUnicode, parseQuery, usableForm, isTemplateToken, FORM_BLOCK, glossKeys, xlKeys, toRow, KIND, ikey, edit1, MemoryBackend, SearchEngine, cmpRows, wtRank, TIER_ORDER, makeFilter };
if(typeof module !== 'undefined' && module.exports) module.exports = api;
if(typeof window !== 'undefined') window.LexiconCore = api;
})(typeof window !== 'undefined' ? window : globalThis);

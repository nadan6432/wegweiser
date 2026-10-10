/* ============================================================
   LEXICON STORE (Phase 13) — persistent, indexed master dictionary.

   * Separate IndexedDB database `wegweiser_lexicon` (own version number). The user's
     progress database `wegweiser_db` is never cleared or rewritten by this module.
   * ONE copy of the dictionary: full records + derived index fields in the `lemmas`
     object store. No Cache Storage copy, no in-memory copy of the lexicon.
   * Built lazily, on first dictionary use, from the Phase 12 per-letter chunk files
     (streamed record-by-record — never a whole chunk in memory), resumable per chunk,
     with progress reporting. Search works on whatever is built (flagged partial) and
     fully offline once complete.
   * Search = indexed lookups / bounded cursor ranges (see lexiconCore.js SearchEngine).
   ============================================================ */
'use strict';
const LexiconStore = (() => {
  const C = (typeof LexiconCore !== 'undefined') ? LexiconCore : require('./lexiconCore.js');
  const DB_NAME = 'wegweiser_lexicon', DB_VERSION = 1, SCHEMA = 'lexicon-schema-1';
  const DEFAULT_BASE = 'data/processed/master/';
  const DELIM = '},{"id":"lex_';
  const BATCH = 500;
  const T = { hook: {} };                       // failure-injection hooks, used only by tests

  let db = null, backend = null, engine = null, readyPromise = null, buildMeta = null, statsMeta = null, failed = false;
  const listeners = new Set();
  let status = { phase: 'idle', complete: false, usable: false, done: 0, total: 0, chunksDone: 0, chunksTotal: 0, message: '', error: null };
  function setStatus(p){ status = Object.assign({}, status, p); listeners.forEach(f => { try{ f(status); }catch(e){} }); }
  const getStatus = () => status;
  const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };

  /* ---------------- IndexedDB plumbing ---------------- */
  function openDb(){
    return new Promise((resolve, reject) => {
      if(typeof indexedDB === 'undefined'){ reject(Object.assign(new Error('IndexedDB is not available in this browser context.'), { kind: 'unavailable' })); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {                                  // additive, versioned migration
        const d = e.target.result;
        if(!d.objectStoreNames.contains('lemmas')){
          d.createObjectStore('lemmas', { keyPath: 'id' }).createIndex('i', '_i', { multiEntry: true });   // ONE combined index (see lexiconCore.js)
        }
        if(!d.objectStoreNames.contains('keytab')) d.createObjectStore('keytab', { keyPath: 'chunk' });   // compact key projection for substring search
        if(!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(Object.assign((e.target && e.target.error) || new Error('open failed'), { kind: 'unavailable' }));
      req.onblocked = () => reject(Object.assign(new Error('Database upgrade blocked by another tab.'), { kind: 'unavailable' }));
    });
  }
  const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const txDone = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('tx aborted')); });

  function IdbBackend(d){
    const stats = { rowsRead: 0, lookups: 0 };
    const store = (mode) => d.transaction('lemmas', mode || 'readonly').objectStore('lemmas');
    const idxOf = () => store().index('i');
    const be = {
      stats, kind: 'indexeddb',
      async putMany(rows, keytabRec){ const tx = d.transaction(keytabRec ? ['lemmas', 'keytab'] : ['lemmas'], 'readwrite'); const s = tx.objectStore('lemmas'); rows.forEach(r => s.put(r)); if(keytabRec) tx.objectStore('keytab').put(keytabRec); await txDone(tx); },
      async putKeytab(rec){ const tx = d.transaction('keytab', 'readwrite'); tx.objectStore('keytab').put(rec); await txDone(tx); },
      async clear(){ const tx = d.transaction(['lemmas', 'keytab', 'meta'], 'readwrite'); tx.objectStore('lemmas').clear(); tx.objectStore('keytab').clear(); tx.objectStore('meta').clear(); await txDone(tx); },
      async count(){ return reqP(store().count()); },
      async get(id){ const r = await reqP(store().get(id)); if(r) stats.rowsRead++; return r || null; },
      async getMany(ids){ const s = store(); const rows = await Promise.all(ids.map(i => reqP(s.get(i)))); const out = rows.filter(Boolean); stats.rowsRead += out.length; return out; },
      async lookup(n, key, o){
        o = o || {}; stats.lookups++;
        const idx = idxOf(), range = IDBKeyRange.only(C.ikey(n, key));
        if(!o.predicate){ const rows = await reqP(idx.getAll(range, o.limit || undefined)); stats.rowsRead += rows.length; return rows; }
        return new Promise((res, rej) => { const out = []; let scanned = 0; const rq = idx.openCursor(range);
          rq.onsuccess = () => { const c = rq.result; if(!c){ res(out); return; } scanned++; stats.rowsRead++; if(o.predicate(c.value)){ out.push(c.value); if(o.limit && out.length >= o.limit){ res(out); return; } } if(scanned >= 5000){ res(out); return; } c.continue(); };
          rq.onerror = () => rej(rq.error); });
      },
      async countRange(n, lo, hi){ return reqP(idxOf().count(IDBKeyRange.bound(C.ikey(n, lo), C.ikey(n, hi), false, true))); },
      scan(n, o){
        return new Promise((res, rej) => {
          const idx = idxOf(); const range = IDBKeyRange.bound(C.ikey(n, o.lo), C.ikey(n, o.hi), false, true);
          const rq = idx.openCursor(range); let skip = o.skip || 0, scanned = 0, advanced = false; const out = []; const cap = o.scanCap || 1e9;
          rq.onsuccess = () => {
            const c = rq.result; if(!c){ res({ rows: out, scanned, done: true }); return; }
            if(!o.predicate && skip > 0 && !advanced){ advanced = true; const k = skip; skip = 0; c.advance(k); return; }
            scanned++; stats.rowsRead++;
            if(!o.predicate || o.predicate(c.value)){ if(skip > 0) skip--; else { out.push(c.value); if(out.length >= o.limit){ res({ rows: out, scanned, done: false }); return; } } }
            if(scanned >= cap){ res({ rows: out, scanned, done: false, capped: true }); return; }
            c.continue();
          };
          rq.onerror = () => rej(rq.error);
        });
      },
      /* Substring candidates from the key projection: one record per source chunk holding a single packed string
         "id\tfoldedLemma\n..." (one big string clones far faster than thousands of small ones). Records are streamed
         one at a time; the native String.indexOf does the scanning and no lexicon record is read. */
      partial(sub, cap){
        return new Promise((res, rej) => {
          const out = []; const rq = d.transaction('keytab').objectStore('keytab').openCursor();
          rq.onsuccess = () => { const c = rq.result;
            if(!c){ out.sort((a, b) => (a.pos - b.pos) || (a.len - b.len) || (a.id < b.id ? -1 : 1)); res(out.slice(0, cap)); return; }
            const t = c.value.text; let p = t.indexOf(sub);
            while(p >= 0){
              const ls = t.lastIndexOf('\n', p) + 1, tab = t.indexOf('\t', ls);
              if(p <= tab){ p = t.indexOf(sub, tab + 1); continue; }          // matched inside the id part: look again in this line's key part
              const nl = t.indexOf('\n', p), le = nl < 0 ? t.length : nl;
              out.push({ id: t.slice(ls, tab), pos: p - tab - 1, len: le - tab - 1 });
              p = t.indexOf(sub, le + 1);
            }
            c.continue(); };
          rq.onerror = () => rej(rq.error);
        });
      },
      fuzzy(w, cap){
        return new Promise((res, rej) => {
          const out = []; const rq = d.transaction('keytab').objectStore('keytab').openCursor();
          rq.onsuccess = () => { const c = rq.result; if(!c || out.length >= cap){ res(out); return; }
            const t = c.value.text; let ls = 0;
            while(ls < t.length && out.length < cap){ let nl = t.indexOf('\n', ls); if(nl < 0) nl = t.length; const tab = t.indexOf('\t', ls);
              const keyLen = nl - tab - 1; if(Math.abs(keyLen - w.length) <= 1 && C.edit1(w, t.slice(tab + 1, nl))) out.push({ id: t.slice(ls, tab), len: keyLen }); ls = nl + 1; }
            c.continue(); };
          rq.onerror = () => rej(rq.error);
        });
      },
      async getMeta(k){ const r = await reqP(d.transaction('meta').objectStore('meta').get(k)); return r ? r.value : null; },
      async setMeta(k, v){ const tx = d.transaction('meta', 'readwrite'); tx.objectStore('meta').put({ key: k, value: v }); await txDone(tx); },
    };
    return be;
  }

  /* ---------------- streaming chunk reader ----------------
     Chunk files are minified JSON arrays of records. Every unescaped quote in JSON is
     structural, so `},{"id":"lex_` can only occur at a record boundary — we split on it
     and JSON.parse each record on its own (≈2 KB), keeping memory flat (no 14 MB parse).
     Anything unexpected -> BoundaryError -> caller falls back to a whole-chunk parse. */
  class BoundaryError extends Error {}
  async function* streamRecords(res){
    const reader = res.body.getReader(); const dec = new TextDecoder('utf-8'); let buf = '', first = true, bytes = 0;
    const parse = s => { try{ return JSON.parse(s); }catch(e){ throw new BoundaryError('unparseable record'); } };
    for(;;){
      const { value, done } = await reader.read();
      if(value){ bytes += value.length; buf += dec.decode(value, { stream: true }); }
      if(done) buf += dec.decode();
      if(first && buf.length){ if(buf.charCodeAt(0) === 0xFEFF) buf = buf.slice(1); if(buf[0] !== '[') throw new BoundaryError('not an array'); buf = buf.slice(1); first = false; }
      let i;
      while((i = buf.indexOf(DELIM)) >= 0){ const piece = buf.slice(0, i + 1); buf = buf.slice(i + 2); yield { rec: parse(piece), bytes }; }
      if(done) break;
    }
    buf = buf.trim(); if(buf.endsWith(']')) buf = buf.slice(0, -1);
    if(buf) yield { rec: parse(buf), bytes };
  }

  const isQuota = e => e && (e.name === 'QuotaExceededError' || (e.message && /quota/i.test(e.message)));
  const yieldUi = () => new Promise(r => setTimeout(r, 0));

  async function buildChunk(letter, base, bm, onRecords){
    const url = base + 'lemmas/' + letter + '.json';
    const counters = bm.excluded || (bm.excluded = {});
    let batch = [], written = 0, kt = { chunk: letter, lines: [] }; const wt = bm.wordTypes || (bm.wordTypes = {});
    const flush = async () => { if(!batch.length) return; await backend.putMany(batch); written += batch.length; onRecords(batch.length); batch = []; await yieldUi(); };
    const take = rec => { const row = C.toRow(rec, counters); wt[rec.wordType] = (wt[rec.wordType] || 0) + 1; batch.push(row); kt.lines.push(row.id + '\t' + row._k.replace(/[\t\n\r]/g, ' ')); };
    // per-chunk word-type tallies must not double count on resume: tally into a temp map, merged by caller
    const before = JSON.stringify(wt);
    try{
      const res = await fetch(url, { cache: 'no-store' });
      if(!res.ok) throw new Error('http ' + res.status + ' for ' + url);
      if(!res.body || !res.body.getReader) throw new BoundaryError('no streaming body');
      for await (const { rec } of streamRecords(res)){
        take(rec);
        if(batch.length >= BATCH){ await flush(); if(T.hook.stopAfterRecords && (bm._recsThisRun = (bm._recsThisRun || 0) + BATCH) >= T.hook.stopAfterRecords) throw new Error('test-interrupt'); }
      }
    }catch(e){
      if(!(e instanceof BoundaryError)) throw e;
      // fallback: whole-chunk parse (still correct, just more memory for this one chunk)
      Object.assign(wt, JSON.parse(before)); batch = []; written = 0; kt = { chunk: letter, lines: [] };
      const arr = await (await fetch(url, { cache: 'no-store' })).json();
      for(const rec of arr){ take(rec); if(batch.length >= BATCH) await flush(); }
    }
    await flush();
    await backend.putKeytab({ chunk: letter, text: kt.lines.join('\n') });                      // written before the chunk is marked done (resume-safe: re-done chunks just overwrite it)
    return written;
  }

  /* ---------------- ensureReady: open, check, migrate/resume ---------------- */
  async function loadManifest(base){
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const to = ctl && setTimeout(() => ctl.abort(), 8000);
    try{ const res = await fetch(base + 'manifest.json', { cache: 'no-store', signal: ctl && ctl.signal }); if(!res.ok) throw new Error('http ' + res.status); return await res.json(); }
    finally{ if(to) clearTimeout(to); }
  }
  const freshBuild = m => ({ schema: SCHEMA, pipelineVersion: m.pipelineVersion || 'unknown', totalLemmas: m.totalLemmas, chunks: {}, complete: false, startedAt: Date.now(), updatedAt: Date.now(), wordTypes: {}, excluded: {} });

  async function open(){
    if(db) return;
    db = await openDb(); backend = IdbBackend(db); engine = C.SearchEngine(backend, { canonicalWordType: (typeof Schema !== 'undefined' && Schema.canonicalWordType) ? Schema.canonicalWordType : null });
    db.onversionchange = () => { try{ db.close(); }catch(e){} db = null; readyPromise = null; };
  }

  async function runBuild(base, manifest){
    let bm = buildMeta;
    const chunks = manifest.chunks; const totalLemmas = manifest.totalLemmas;
    const doneCount = () => Object.values(bm.chunks).reduce((a, c) => a + (c.done ? c.count : 0), 0);
    setStatus({ phase: 'building', total: totalLemmas, done: doneCount(), chunksTotal: chunks.length, chunksDone: chunks.filter(c => bm.chunks[c.letter] && bm.chunks[c.letter].done).length, message: 'Building the offline dictionary index…' });
    let completedThisRun = 0; bm._recsThisRun = 0;
    for(const c of chunks){
      if(bm.chunks[c.letter] && bm.chunks[c.letter].done) continue;
      const wtBefore = JSON.stringify(bm.wordTypes), exBefore = JSON.stringify(bm.excluded);
      let recsInChunk = 0, base0 = doneCount();
      const written = await buildChunk(c.letter, base, bm, n => { recsInChunk += n; setStatus({ done: base0 + recsInChunk }); });
      if(written !== c.lemmas){                       // integrity: never mark a chunk done unless the count matches the manifest
        bm.wordTypes = JSON.parse(wtBefore); bm.excluded = JSON.parse(exBefore);
        throw Object.assign(new Error('Chunk ' + c.letter + ': expected ' + c.lemmas + ' records, wrote ' + written), { kind: 'integrity' });
      }
      bm.chunks[c.letter] = { done: true, count: written }; bm.updatedAt = Date.now();
      const persist = Object.assign({}, bm); delete persist._recsThisRun;
      await backend.setMeta('build', persist);
      completedThisRun++;
      setStatus({ done: doneCount(), chunksDone: Object.keys(bm.chunks).length, usable: true });
      if(T.hook.stopAfterChunks && completedThisRun >= T.hook.stopAfterChunks) throw new Error('test-interrupt');
      await yieldUi();
    }
    bm.complete = true; bm.completedAt = Date.now(); delete bm._recsThisRun;
    await backend.setMeta('build', bm);
    buildMeta = bm; statsMeta = { wordTypes: bm.wordTypes, excluded: bm.excluded };
    await purgeLegacyCache();
  }

  /* The pre-Phase-13 runtime stored a full second copy of every chunk in the user DB's
     `masterLexiconCache` store (and DB.exportAll() exported it). It is a disposable cache,
     not user data; it is cleared ONLY after the new index is complete. No other store is touched. */
  async function purgeLegacyCache(){
    try{ if(typeof DB !== 'undefined' && DB.mode === 'indexeddb'){ const n = (await DB.getAll('masterLexiconCache')).length; if(n){ await DB.clearStore('masterLexiconCache'); await backend.setMeta('legacyCachePurged', { at: Date.now(), entries: n }); } } }catch(e){ /* best effort */ }
  }

  /* If a NEW lexicon build ships (different pipelineVersion in manifest.json) the local index is rebuilt
     once, resumably, in the background. Failure/offline = silently keep serving the existing index. */
  let updateChecked = false;
  function scheduleUpdateCheck(base){
    if(updateChecked) return; updateChecked = true;
    setTimeout(async () => {
      try{
        const m = await loadManifest(base);
        if(m && buildMeta && buildMeta.complete && (m.pipelineVersion || 'unknown') !== buildMeta.pipelineVersion){
          await backend.clear(); buildMeta = null; readyPromise = null; ensureReady({ base });
        }
      }catch(e){ /* offline or stalled: keep the local index */ }
    }, 2000);
  }

  function ensureReady(opts){
    opts = opts || {};
    if(readyPromise) return readyPromise;
    if(failed) return Promise.resolve(status);          // a failed build is NOT retried by re-renders/keystrokes; the user's "Try again" (or the next launch) does that
    const base = opts.base || DEFAULT_BASE;
    readyPromise = (async () => {
      try{
        setStatus({ phase: 'opening', error: null, message: 'Opening dictionary…' });
        await open();
        buildMeta = await backend.getMeta('build');
        const haveRows = buildMeta && Object.keys(buildMeta.chunks || {}).length > 0;
        if(buildMeta && buildMeta.complete){ statsMeta = { wordTypes: buildMeta.wordTypes, excluded: buildMeta.excluded }; }
        /* Offline-first: a complete local index is usable IMMEDIATELY. Nothing waits on the network; the
           manifest/version check happens later in the background (scheduleUpdateCheck). */
        if(buildMeta && buildMeta.complete && buildMeta.schema === SCHEMA){
          setStatus({ phase: 'ready', complete: true, usable: true, done: buildMeta.totalLemmas, total: buildMeta.totalLemmas, message: '', error: null });
          scheduleUpdateCheck(base); return status;
        }
        let manifest = null, offline = false;
        try{ manifest = await loadManifest(base); }catch(e){ offline = true; }
        if(buildMeta && buildMeta.schema !== SCHEMA && manifest){ buildMeta = null; await backend.clear(); }   // lexicon DB only, never wegweiser_db
        if(manifest && buildMeta && buildMeta.pipelineVersion !== (manifest.pipelineVersion || 'unknown')){ buildMeta = null; await backend.clear(); }
        if(offline){
          if(buildMeta && buildMeta.complete){ setStatus({ phase: 'ready', complete: true, usable: true, done: buildMeta.totalLemmas, total: buildMeta.totalLemmas, message: '' }); return status; }
          if(haveRows){ setStatus({ phase: 'partial', complete: false, usable: true, error: { kind: 'offline', message: 'You are offline and the dictionary index is only partly built. Reconnect to finish it.' } }); return status; }
          setStatus({ phase: 'error', complete: false, usable: false, error: { kind: 'offline', message: 'The dictionary has not been downloaded yet and you appear to be offline. It needs one online visit to build the offline index.' } }); return status;
        }
        if(buildMeta && buildMeta.complete){ setStatus({ phase: 'ready', complete: true, usable: true, done: buildMeta.totalLemmas, total: buildMeta.totalLemmas, message: '' }); return status; }
        if(!buildMeta) buildMeta = freshBuild(manifest);
        buildMeta.totalLemmas = manifest.totalLemmas;
        if(navigator.storage && navigator.storage.estimate){ try{ const e = await navigator.storage.estimate(); if(e.quota && e.usage != null && (e.quota - e.usage) < 160e6) setStatus({ warning: 'Low free storage (' + Math.round((e.quota - e.usage)/1e6) + ' MB). The offline dictionary index needs roughly 110 MB.' }); }catch(e){} }
        const go = async () => { await runBuild(base, manifest); setStatus({ phase: 'ready', complete: true, usable: true, done: manifest.totalLemmas, total: manifest.totalLemmas, message: '', error: null }); };
        if(typeof navigator !== 'undefined' && navigator.locks){
          const got = await navigator.locks.request('wegweiser-lexicon-build', { ifAvailable: true }, async lock => { if(!lock) return false; await go(); return true; });
          if(!got){ setStatus({ phase: 'building', message: 'Another tab is building the dictionary index…', usable: haveRows });
            while(true){ await new Promise(r => setTimeout(r, 1500)); const m = await backend.getMeta('build'); if(m){ setStatus({ done: Object.values(m.chunks).reduce((a, c) => a + (c.done ? c.count : 0), 0) }); if(m.complete){ buildMeta = m; statsMeta = { wordTypes: m.wordTypes, excluded: m.excluded }; setStatus({ phase: 'ready', complete: true, usable: true }); break; } } } }
        } else await go();
        return status;
      }catch(e){
        const kind = e.kind || (isQuota(e) ? 'quota' : (e.message === 'test-interrupt' ? 'interrupted' : 'build'));
        const msg = kind === 'quota' ? 'Not enough browser storage to build the offline dictionary. Free some space and try again; the app keeps working without the full dictionary.'
          : kind === 'unavailable' ? 'This browser context does not allow local storage for the dictionary (private mode?). Core vocabulary still works.'
          : kind === 'interrupted' ? 'Dictionary index build was interrupted. It will resume where it stopped.'
          : 'The dictionary index could not be completed: ' + (e.message || e);
        const part = !!(buildMeta && Object.keys(buildMeta.chunks || {}).length);
        setStatus({ phase: 'error', complete: false, usable: part, error: { kind, message: msg } });
        readyPromise = null; failed = true;          // allow an explicit Retry only
        return status;
      }
    })();
    return readyPromise;
  }
  const retry = () => { readyPromise = null; failed = false; return ensureReady(); };

  /* ---------------- public search API ---------------- */
  const toEntry = row => {
    if(!row) return null;
    const B = (typeof MasterLexiconBridge !== 'undefined') ? MasterLexiconBridge : require('../services/masterLexiconRuntime.js');
    return B.toDictionaryEntry(row);
  };
  async function search(q, o){
    if(!db) { await ensureReady(); if(!db) return { items: [], unavailable: true, status }; }
    const r = await engine.search(q, o);
    r.partialIndex = !(buildMeta && buildMeta.complete); r.entries = r.items.map(i => Object.assign({ tier: i.tier, articleMismatch: !!i.articleMismatch }, { entry: toEntry(i.row) }));
    return r;
  }
  async function browse(letter, o){ if(!db) await ensureReady(); if(!db) return { items: [], entries: [], unavailable: true }; const r = await engine.browse(letter, o); r.entries = r.items.map(toEntry); r.partialIndex = !(buildMeta && buildMeta.complete); return r; }
  async function getEntry(id){ if(!db) await ensureReady(); if(!db) return null; return toEntry(await backend.get(id)); }
  async function resolveWord(w){ if(!db) await ensureReady(); if(!db) return null; return toEntry(await engine.resolveWord(w)); }
  const wordTypes = () => statsMeta ? Object.keys(statsMeta.wordTypes || {}) : [];
  async function diagnostics(){
    await ensureReady(); const e = (navigator.storage && navigator.storage.estimate) ? await navigator.storage.estimate() : null;
    return { rows: await backend.count(), build: buildMeta, usageMB: e ? +(e.usage/1e6).toFixed(1) : null, quotaMB: e ? +(e.quota/1e6).toFixed(0) : null, rowsReadTotal: backend.stats.rowsRead };
  }
  const resetForTests = async () => { try{ if(db) db.close(); }catch(e){} db = null; backend = null; engine = null; readyPromise = null; buildMeta = null; updateChecked = false; failed = false; };

  const api = { ensureReady, retry, getStatus, subscribe, search, browse, getEntry, resolveWord, wordTypes, diagnostics, toEntry, _test: T, _resetForTests: resetForTests, streamRecords, DELIM, SCHEMA, DB_NAME,
    get backend(){ return backend; } };
  return api;
})();
if(typeof window !== 'undefined') window.LexiconStore = LexiconStore;
if(typeof module !== 'undefined' && module.exports) module.exports = LexiconStore;

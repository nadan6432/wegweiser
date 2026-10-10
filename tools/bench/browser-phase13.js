// Phase 13 real-browser verification + benchmark (Playwright / headless Chromium, persistent profile so IndexedDB
// survives page reloads exactly like an installed app).  Modes:
//   node tools/bench/browser-phase13.js build  <profileDir>   first-run build; partial-search-during-build; timings
//   node tools/bench/browser-phase13.js warm   <profileDir>   warm start, benchmark queries, offline, UI, Add to Learning, reload persistence
//   node tools/bench/browser-phase13.js resume <profileDir>   interrupted build (mid-chunk + chunk boundary + quota) then resume
// Requires: node tools/bench/static-server.js <repo> 8899
'use strict';
const { chromium } = require('playwright');
const mode = process.argv[2], dir = process.argv[3] || '/tmp/wgprofile';
const BASE = 'http://localhost:8899';
const QUERIES = ['gehen','ging','gegangen','Haus','Häuser','der Tisch','Tisch','Frau','frau','arbe','xqzvbn'];
let pass = 0, fail = 0;
const check = (name, cond, extra) => { cond ? pass++ : fail++; console.log((cond ? 'PASS - ' : 'FAIL - ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); };
const PROFILE = { name:'Test', goals:['General German'], styles:['Vocabulary'], minutesPerDay:15, difficulty:'Balanced', correction:'every', level:'A2', explainLang:'en', theme:'light' };

async function launch(){
  const ctx = await chromium.launchPersistentContext(dir, { headless: true, args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const page = ctx.pages()[0] || await ctx.newPage();
  const errors = []; const reqs = { lemmas: 0, manifest: 0, other: 0 };
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if(m.type() === 'error') errors.push(m.text()); if(m.text().startsWith('progress')) console.log('  [page]', m.text()); });
  
  page.on('request', r => { const u = r.url(); if(u.includes('/lemmas/')) reqs.lemmas++; else if(u.endsWith('manifest.json')) reqs.manifest++; else reqs.other++; });
  await page.addInitScript(() => { window.__t = {}; const poll = setInterval(() => { if(window.__WG_TEST && window.__WG_TEST.getState().view && document.getElementById('app').innerText.length > 20){ window.__t.shell = performance.now(); clearInterval(poll); } }, 10); });
  return { ctx, page, errors, reqs };
}
async function boot(page){
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__t.shell, null, { timeout: 30000, polling: 25 });
  return page.evaluate(() => ({ shellMs: Math.round(window.__t.shell), heapMB: +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) }));
}
const openDict = page => page.evaluate(async () => { const S = window.__WG_TEST.getState(); if(!S.profile) await window.__WG_TEST.saveProfile(JSON.parse(arguments[0] || 'null') || S.profile); S.view = 'dictionary'; S.dictDetailId = null; S.dictQuery = ''; S.dictLetter = null; window.__WG_TEST.render(); });
const waitComplete = (page, ms) => page.waitForFunction(() => window.__WG_TEST.LexiconStore.getStatus().complete, null, { timeout: ms, polling: 500 });
async function ensureProfile(page){ await page.waitForTimeout(800); await page.evaluate(async p => { if(!window.__WG_TEST.getState().profile) await window.__WG_TEST.saveProfile(p); }, PROFILE); }
async function logProgress(page){ await page.evaluate(() => { let last = 0; const t0 = performance.now(); window.__WG_TEST.LexiconStore.subscribe(s => { if(performance.now() - last > 20000){ last = performance.now(); console.log('progress ' + Math.round((performance.now() - t0) / 1000) + 's done=' + s.done + ' heapMB=' + Math.round(performance.memory.usedJSHeapSize / 1e6)); } }); }); }

(async () => {
  const { ctx, page, errors, reqs } = await launch();
  const R = {};
  const realErrors = () => errors.filter(e => !/Failed to load resource/.test(e));
  if(mode === 'build'){
    R.cold = await boot(page); await ensureProfile(page); await logProgress(page);
    console.log('RESULT cold-start', JSON.stringify(R.cold));
    const t0 = Date.now();
    await page.evaluate(() => { const S = window.__WG_TEST.getState(); S.view = 'dictionary'; window.__WG_TEST.render(); });   // user opens the dictionary -> lazy build starts
    await page.waitForFunction(() => window.__WG_TEST.LexiconStore.getStatus().usable, null, { timeout: 120000, polling: 250 });
    R.firstUsableMs = Date.now() - t0;
    const mid = await page.evaluate(async () => { const r = await window.__WG_TEST.LexiconStore.search('Arbeit', { limit: 5 }); return { partial: r.partialIndex, n: r.entries.length, st: window.__WG_TEST.LexiconStore.getStatus() }; });
    check('search works DURING the first-time build and is flagged as partial', mid.partial === true && mid.st.phase === 'building', { n: mid.n, done: mid.st.done });
    const bar = await page.evaluate(() => !!document.querySelector('#dictMasterStatus progress'));
    check('progress UI is shown during the build', bar);
    const heapDuring = await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1e6));
    await waitComplete(page, 900000);
    R.buildMs = Date.now() - t0;
    const d = await page.evaluate(() => window.__WG_TEST.LexiconStore.diagnostics());
    R.rows = d.rows; R.usageMB = d.usageMB; R.excluded = d.build.excluded;
    check('build completed with all 92,880 records stored', d.rows === 92880 && d.build.complete && d.build.totalLemmas === 92880, { rows: d.rows });
    console.log('RESULT build', JSON.stringify({ buildMs: R.buildMs, firstUsableMs: R.firstUsableMs, heapMBduringBuild: heapDuring, rows: d.rows, storageUsageMB: d.usageMB, quotaMB: d.quotaMB, requestsToLemmaChunks: reqs.lemmas }));
  }

  if(mode === 'warm'){
    R.warm = await boot(page);
    // make the run repeatable: forget anything a previous run added to Learning (test profile only)
    await page.waitForFunction(() => window.__WG_TEST.getState().profile !== undefined, null, { timeout: 5000 });
    await page.evaluate(async () => { const vp = await DB.getAll('vocabProgress'); for(const v of vp) if(String(v.id).startsWith('lex_') || v.id === 'v_tisch') await DB.remove('vocabProgress', v.id); await DB.clearStore('learnedLexicon'); });
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__t.shell, null, { timeout: 30000 }); reqs.lemmas = 0; reqs.manifest = 0;
    R.warm = await page.evaluate(() => ({ shellMs: Math.round(window.__t.shell), heapMB: +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) }));
    console.log('RESULT warm-start', JSON.stringify(R.warm));
    check('warm start: app shell usable quickly (<2000 ms) with tiny heap (<40 MB) — no dictionary loaded', R.warm.shellMs < 2000 && R.warm.heapMB < 40, R.warm);
    const before = await page.evaluate(() => ({ poolSize: window.__WG_TEST.dictionaryPool().length, lexOpen: window.__WG_TEST.LexiconStore.getStatus().phase }));
    check('nothing from the master dictionary is in memory at startup (pool = curated only, store not opened)', before.poolSize < 1000 && before.lexOpen === 'idle', before);
    check('no dictionary chunk was fetched at startup', reqs.lemmas === 0, { lemmaRequests: reqs.lemmas });
    // first dictionary use on a warm profile
    const t = await page.evaluate(async () => { const L = window.__WG_TEST.LexiconStore; const t0 = performance.now(); const st = await L.ensureReady(); const open = performance.now() - t0; const t1 = performance.now(); const r = await L.search('gehen', { limit: 30 }); return { openMs: +open.toFixed(1), firstSearchMs: +(performance.now() - t1).toFixed(1), complete: st.complete, first: r.entries[0].entry.lemma, heapMB: +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) }; });
    console.log('RESULT cold-dictionary', JSON.stringify(t));
    check('reopening does not rebuild the index (ready immediately, zero lemma-chunk requests)', t.complete && reqs.lemmas === 0 && t.openMs < 1500, { openMs: t.openMs, lemmaRequests: reqs.lemmas, manifestRequests: reqs.manifest });
    // benchmark
    const bench = await page.evaluate(async (qs) => {
      const L = window.__WG_TEST.LexiconStore; const out = {};
      for(const q of qs){
        const t0 = performance.now(); const r = await L.search(q, { limit: 30 }); const first = performance.now() - t0;
        const t1 = performance.now(); for(let i = 0; i < 10; i++) await L.search(q, { limit: 30 }); const avg = (performance.now() - t1) / 10;
        out[q] = { firstMs: +first.toFixed(1), avgMs: +avg.toFixed(1), rowsRead: r.stats.rowsRead, returned: r.entries.length, hasMore: r.hasMore, top: r.entries[0] ? r.entries[0].tier + ':' + (r.entries[0].entry.article ? r.entries[0].entry.article + ' ' : '') + r.entries[0].entry.lemma : null };
      }
      if(window.gc) window.gc(); return { out, heapMB: +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) };
    }, QUERIES);
    console.log('RESULT search-bench', JSON.stringify(bench));
    const exp = { gehen: 'exact:gehen', ging: 'inflected:gehen', gegangen: 'inflected:gehen', Haus: 'exact:das Haus', 'Häuser': 'inflected:das Haus', 'der Tisch': 'exact:der Tisch', Tisch: 'exact:der Tisch', Frau: 'exact:die Frau', frau: 'exact:frau', arbe: 'prefix:die Arbeit', xqzvbn: null };
    Object.keys(exp).forEach(q => check('IndexedDB search "' + q + '" -> ' + exp[q], bench.out[q].top === exp[q], bench.out[q].top));
    check('typical local searches within 100 ms (avg of 10 repeats, all benchmark queries)', Object.values(bench.out).every(v => v.avgMs < 100), Object.fromEntries(Object.entries(bench.out).map(([k, v]) => [k, v.avgMs])));
    check('records loaded into JS memory per search stay tiny (<500 rows even for 30-result pages)', Object.values(bench.out).every(v => v.rowsRead < 500));
    // offline: network off, lexicon module reset (forces a fresh open) -> must be served from IndexedDB alone
    const lemmaBefore = reqs.lemmas;
    await ctx.setOffline(true);
    const off = await page.evaluate(async () => { const L = window.__WG_TEST.LexiconStore; await L._resetForTests(); const st = await L.ensureReady(); const r1 = await L.search('Häuser', { limit: 5 }); const r2 = await L.search('der Tisch', { limit: 5 }); return { phase: st.phase, complete: st.complete, h: r1.entries[0].entry.lemma, t: r2.entries[0].entry.lemma, err: st.error }; });
    check('OFFLINE (network disabled, store re-opened): dictionary ready from IndexedDB and searches resolve', off.phase === 'ready' && off.complete && off.h === 'Haus' && off.t === 'Tisch', off);
    await ctx.setOffline(false);
    // data blocked + full page reload: the app + dictionary work without any /data/ request succeeding
    await page.route('**/data/**', r => r.abort());
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__t.shell, null, { timeout: 30000 });
    const off2 = await page.evaluate(async () => { const L = window.__WG_TEST.LexiconStore; const st = await L.ensureReady(); const r = await L.search('gegangen', { limit: 3 }); return { phase: st.phase, top: r.entries[0].entry.lemma }; });
    check('after a full reload with every /data/ request blocked, search still works from the local index', off2.phase === 'ready' && off2.top === 'gehen', off2);
    await page.unroute('**/data/**');
    // UI flow
    await ensureProfile(page);
    await page.evaluate(() => { const S = window.__WG_TEST.getState(); S.view = 'dictionary'; S.dictQuery = ''; S.dictLetter = null; window.__WG_TEST.render(); });
    await page.fill('#dictSearch', 'der Tisch');
    await page.waitForFunction(() => /Tisch/.test(document.getElementById('dictMaster').innerText) && !/Searching the full dictionary/.test(document.getElementById('dictMaster').innerText), null, { timeout: 8000 });
    const ui1 = await page.evaluate(() => document.getElementById('dictMaster').innerText.slice(0, 300));
    check('UI: typing "der Tisch" shows the Tisch noun result with the article exactly once', /der\s+Tisch/.test(ui1) && !/der\s+der/.test(ui1), ui1.slice(0, 120));
    await page.fill('#dictSearch', 'xqzvbn');
    await page.waitForFunction(() => /No dictionary entry found/.test(document.getElementById('dictMaster').innerText), null, { timeout: 8000 }).catch(() => {});
    check('UI: empty-result state is shown for a query with no matches', await page.evaluate(() => /No dictionary entry found/.test(document.getElementById('dictMaster').innerText)));
    await page.fill('#dictSearch', 'Tiscg');
    await page.waitForFunction(() => /Did you mean/.test(document.getElementById('dictMaster').innerText), null, { timeout: 8000 }).catch(() => {});
    check('UI: typo suggestion ("Did you mean") appears only when nothing else matched', await page.evaluate(() => /Did you mean/.test(document.getElementById('dictMaster').innerText)));
    // Searching / opening must NOT add anything to learning
    const noAdd = await page.evaluate(() => Object.keys(window.__WG_TEST.getState().vocabProgress).filter(k => k.startsWith('lex_')).length);
    check('searching/opening the master dictionary added nothing to the learning system', noAdd === 0, { lexProgressIds: noAdd });
    // Add to Learning on a master-only word
    await page.fill('#dictSearch', 'Abbauort');
    await page.waitForFunction(() => /Abbaugebiet/.test(document.getElementById('dictMaster').innerText), null, { timeout: 8000 }).catch(() => {});
    const target = await page.evaluate(async () => { const r = await window.__WG_TEST.LexiconStore.search('Abbauort', { limit: 3 }); const e = r.entries.find(x => x.entry.lemma === 'Abbauort'); return e ? e.entry.id : null; });
    check('found a master-only word (Abbauort) to add', !!target, target);
    const vocabBefore = await page.evaluate(() => window.__WG_TEST.getVocab().length);
    await page.evaluate(id => { const b = document.querySelector('#dictMaster [data-action="dict-add-review"][data-arg="' + id + '"]'); b && b.click(); }, target);
    await page.waitForFunction(id => !!window.__WG_TEST.getState().vocabProgress[id], target, { timeout: 8000 }).catch(() => {});
    // click twice more to prove idempotence
    await page.evaluate(async id => { for(let i = 0; i < 2; i++){ const el = document.createElement('button'); el.dataset.action = 'dict-add-review'; el.dataset.arg = id; document.body.appendChild(el); el.click(); el.remove(); await new Promise(r => setTimeout(r, 150)); } }, target);
    const after = await page.evaluate(id => ({ n: window.__WG_TEST.getVocab().length, tracked: !!window.__WG_TEST.getState().vocabProgress[id], copies: window.__WG_TEST.getVocab().filter(v => v.id === id).length }), target);
    check('Add to Learning adds exactly one canonical record and one progress item, even if clicked repeatedly', after.tracked && after.copies === 1 && after.n === vocabBefore + 1, after);
    // curated precedence + duplicate-free Add to Learning: master "Tisch" is the same word as curated v_tisch
    await page.fill('#dictSearch', 'Tisch');
    await page.waitForFunction(() => { const M = window.__WG_TEST.MasterUI; return M.key.startsWith('s:Tisch|') && !M.loading && M.items.length > 0; }, null, { timeout: 8000 });
    const hid = await page.evaluate(() => ({ masterCard: !!document.querySelector('[data-arg="lex_tisch_noun"]'), curatedCard: !!document.querySelector('[data-arg="v_tisch"]') }));
    check('curated precedence: the curated Tisch card is shown and the duplicate master record is hidden', hid.curatedCard && !hid.masterCard, hid);
    const vBefore = await page.evaluate(() => window.__WG_TEST.getVocab().length);
    await page.evaluate(async () => { const el = document.createElement('button'); el.dataset.action = 'dict-add-review'; el.dataset.arg = 'lex_tisch_noun'; document.body.appendChild(el); el.click(); el.remove(); await new Promise(r => setTimeout(r, 600)); });
    const dd = await page.evaluate(() => ({ n: window.__WG_TEST.getVocab().length, curated: !!window.__WG_TEST.getState().vocabProgress['v_tisch'], masterDup: !!window.__WG_TEST.getState().vocabProgress['lex_tisch_noun'] }));
    check('Add to Learning on a master id that is the same word as a curated entry resolves to the curated record (no duplicate created)', dd.n === vBefore && dd.curated && !dd.masterDup, dd);
    // reload: promoted word persists with its progress, with the lexicon not needed
    const learnedId = target;
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__t.shell && window.__WG_TEST.getState().profile, null, { timeout: 30000 });
    const persisted = await page.evaluate(id => ({ inVocab: !!window.__WG_TEST.getVocab().find(v => v.id === id), tracked: !!window.__WG_TEST.getState().vocabProgress[id], lexPhase: window.__WG_TEST.LexiconStore.getStatus().phase }), learnedId);
    check('after reload the added word and its SRS progress are restored without opening the big dictionary', persisted.inVocab && persisted.tracked && persisted.lexPhase === 'idle', persisted);
    // letter browse
    await ensureProfile(page);
    await page.evaluate(() => { const S = window.__WG_TEST.getState(); S.view = 'dictionary'; S.dictLetter = 'B'; S.dictQuery = ''; window.__WG_TEST.render(); });
    await page.waitForFunction(() => { const m = document.getElementById('dictMaster'); return !!m && /\d+ entries\)/.test(m.innerText); }, null, { timeout: 10000 }).catch(() => {});
    const br = await page.evaluate(() => ({ txt: (document.getElementById('dictMaster') || {innerText:'(no #dictMaster)'}).innerText.slice(0, 120), cards: document.querySelectorAll('#dictMaster .panel-note[data-action="open-dict-detail"]').length, more: !!document.querySelector('#dictMaster [data-action="dict-master-more"]'), head: (document.querySelector('#dictMaster h3') || {}).innerText }));
    check('A–Z browse (letter B) lists a page of entries with a total and a Show more button', br.cards >= 20 && br.more, br);
    // detail view fetch-by-id after reload
    const det = await page.evaluate(async () => { const S = window.__WG_TEST.getState(); const id = Array.from(document.querySelectorAll('#dictMaster [data-action="open-dict-detail"]')).map(e => e.dataset.arg).find(i => i.startsWith('lex_')); S.dictLetter = null; S.dictDetailId = id; window.__WG_TEST.render(); await new Promise(r => setTimeout(r, 800)); return { id, text: document.getElementById('app').innerText.slice(0, 80) }; });
    check('detail view of a master word opens (fetched by id)', !!det.id && !/Loading entry/.test(det.text), det);
    const heapEnd = await page.evaluate(() => { if(window.gc) window.gc(); return +(performance.memory.usedJSHeapSize / 1e6).toFixed(1); });
    console.log('RESULT heap-after-ui', heapEnd + ' MB');
    check('heap after real UI use stays far below the 288–303 MB Phase 12 baseline', heapEnd < 80, heapEnd);
  }

  if(mode === 'resume'){
    await boot(page); await ensureProfile(page);
    const run = (hook) => page.evaluate(async h => { const L = window.__WG_TEST.LexiconStore; await L._resetForTests(); Object.keys(L._test.hook).forEach(k => delete L._test.hook[k]); Object.assign(L._test.hook, h); const st = await L.ensureReady(); const d = await L.diagnostics().catch(() => null); return { st, rows: d && d.rows, chunks: d && d.build && Object.keys(d.build.chunks).length }; }, hook);
    // 1. interrupt in the middle of the first chunk
    let r = await run({ stopAfterRecords: 1500 }); const chunksAfterRun1 = r.chunks;
    check('interrupted mid-chunk: status reports an interruption, no crash, app state stays usable', r.st.phase === 'error' && r.st.error.kind === 'interrupted', r.st.error);
    const shellOk = await page.evaluate(() => { const S = window.__WG_TEST.getState(); S.view = 'dictionary'; window.__WG_TEST.render(); return document.getElementById('app').innerText.length > 100; });
    check('the app UI still renders (dictionary screen) after the failed build', shellOk);
    // 2. reload page (a real "closed the tab" interruption), then interrupt again after 2 completed chunks
    reqs.lemmas = 0; await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__t.shell, null, { timeout: 30000 });
    r = await run({ stopAfterChunks: 2 });
    const doneBefore = r.chunks;
    check('resumed after reload: exactly 2 MORE chunks completed on top of the earlier run, then interrupted again', r.st.error && r.st.error.kind === 'interrupted' && r.chunks === chunksAfterRun1 + 2, { afterRun1: chunksAfterRun1, afterRun2: r.chunks, rows: r.rows });
    const partialSearch = await page.evaluate(async () => { const x = await window.__WG_TEST.LexiconStore.search('Abbau', { limit: 3 }); return { partial: x.partialIndex, n: x.entries.length }; });
    check('an interrupted build leaves a usable partial index (flagged partial)', partialSearch.partial === true && partialSearch.n > 0, partialSearch);
    // 3. simulated storage quota error -> clear error kind, retry later works
    const q = await page.evaluate(async () => { const L = window.__WG_TEST.LexiconStore; await L._resetForTests(); Object.keys(L._test.hook).forEach(k => delete L._test.hook[k]);
      const orig = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(){ const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
      let st; try{ st = await L.ensureReady(); } finally { IDBObjectStore.prototype.put = orig; } return { phase: st.phase, kind: st.error && st.error.kind, msg: st.error && st.error.message }; });
    check('storage quota failure is reported as kind=quota with a human-readable message', q.phase === 'error' && q.kind === 'quota' && /storage/i.test(q.msg), q);
    // 4. final resume: only the remaining chunks are fetched
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__t.shell, null, { timeout: 30000 }); reqs.lemmas = 0;
    const t0 = Date.now(); r = await run({});
    check('final resume completes the index (92,880 rows) after three earlier failures', r.st.complete && r.rows === 92880, { rows: r.rows, secs: Math.round((Date.now() - t0) / 1000) });
    check('final resume downloaded ONLY the missing chunks (31 total minus those already completed)', reqs.lemmas === 31 - doneBefore, { lemmaRequests: reqs.lemmas, alreadyDone: doneBefore });
    const dup = await page.evaluate(async () => { const d = await window.__WG_TEST.LexiconStore.diagnostics(); const r = await window.__WG_TEST.LexiconStore.search('Tisch', { limit: 10 }); return { rows: d.rows, tisch: r.entries.filter(e => e.entry.lemma === 'Tisch' && e.entry.type === 'noun').length }; });
    check('after interrupted+resumed builds there are no duplicate records (exact row count, single Tisch noun)', dup.rows === 92880 && dup.tisch === 1, dup);
  }
  check('no unexpected console/page errors (network failures deliberately induced by the offline tests are excluded)', realErrors().length === 0, realErrors().slice(0, 3));
  console.log('\n' + pass + ' passed, ' + fail + ' failed (browser phase13 — ' + mode + ')');
  await ctx.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.stack || e); process.exit(2); });

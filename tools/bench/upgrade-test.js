// Upgrade-path test: a Phase 12 user (DB v3 with progress + a populated masterLexiconCache) opens the Phase 13 build.
//   node tools/bench/upgrade-test.js old <profile>   (served by the untouched Phase 12 build on :8897)
//   node tools/bench/upgrade-test.js new <profile>   (same origin/port, Phase 13 build) 
'use strict';
const { chromium } = require('playwright');
const [mode, dir] = [process.argv[2], process.argv[3] || '/tmp/wgupgrade'];
const BASE = 'http://localhost:8897';
let pass = 0, fail = 0; const check = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS - ' : 'FAIL - ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); };
const idbInfo = page => page.evaluate(() => new Promise(res => { const q = indexedDB.open('wegweiser_db'); q.onsuccess = () => { const d = q.result; const out = { version: d.version, stores: Array.from(d.objectStoreNames) }; const tx = d.transaction(['vocabProgress', 'masterLexiconCache'].filter(s => out.stores.includes(s))); const c = {}; let n = 0; const names = Array.from(tx.objectStoreNames); names.forEach(s => { const r = tx.objectStore(s).count(); r.onsuccess = () => { c[s] = r.result; if(++n === names.length){ d.close(); out.counts = c; res(out); } }; }); }; }));
(async () => {
  const ctx = await chromium.launchPersistentContext(dir, { headless: true, args: ['--enable-precise-memory-info'] });
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '/index.html'); await page.waitForFunction(() => window.__WG_TEST && window.__WG_TEST.getState().view && window.__WG_TEST.getState().view !== 'loading', null, { timeout: 20000 }); await page.waitForTimeout(500);
  if(mode === 'old'){
    await page.evaluate(async () => { await window.__WG_TEST.saveProfile({ name:'Upg', goals:['General German'], styles:['Vocabulary'], minutesPerDay:15, difficulty:'Balanced', correction:'every', level:'A2', explainLang:'en', theme:'light' }); const S = window.__WG_TEST.getState(); S.view = 'dictionary'; window.__WG_TEST.render(); });
    await page.waitForFunction(() => window.__WG_TEST.getMasterRuntime().isLoaded(), null, { timeout: 120000 });
    await page.fill('#dictSearch', 'Bibliothek'); await page.waitForTimeout(500);
    await page.locator('.panel-note:has-text("Bibliothek")').first().click(); await page.waitForTimeout(200);
    await page.locator('button:has-text("Add to Learning")').first().click(); await page.waitForTimeout(400);
    // a curated word with real SRS history
    await page.evaluate(async () => { const S = window.__WG_TEST.getState(); S.dictDetailId = null; S.dictQuery = ''; window.__WG_TEST.render(); });
    await page.fill('#dictSearch', 'gehen'); await page.waitForTimeout(500);
    await page.locator('.panel-note:has-text("gehen")').first().click(); await page.waitForTimeout(200);
    await page.locator('button:has-text("Add to Learning")').first().click(); await page.waitForTimeout(400);
    const snap = await page.evaluate(() => JSON.stringify(window.__WG_TEST.getState().vocabProgress));
    require('fs').writeFileSync(dir + '-progress.json', snap);
    const info = await idbInfo(page);
    console.log('OLD state:', JSON.stringify({ dbVersion: info.version, counts: info.counts, progressIds: Object.keys(JSON.parse(snap)) }));
    check('Phase 12 user state created: DB v3, progress for a curated and a master word, chunk cache populated', info.version === 3 && info.counts.vocabProgress >= 2 && info.counts.masterLexiconCache > 0, info.counts);
  } else {
    const old = JSON.parse(require('fs').readFileSync(dir + '-progress.json', 'utf8'));
    const info = await idbInfo(page);
    check('existing database upgraded v3 -> v4 in place (additive store learnedLexicon)', info.version === 4 && info.stores.includes('learnedLexicon') && info.stores.includes('vocabProgress'), { version: info.version });
    const now = await page.evaluate(() => JSON.parse(JSON.stringify(window.__WG_TEST.getState().vocabProgress)));
    check('ALL pre-existing learning progress is byte-for-byte unchanged after the upgrade (SRS fields included)', JSON.stringify(now) === JSON.stringify(old), { ids: Object.keys(now) });
    const lexId = Object.keys(old).find(k => k.startsWith('lex_'));
    const pre = await page.evaluate(id => ({ inVocab: !!window.__WG_TEST.getVocab().find(v => v.id === id), lexPhase: window.__WG_TEST.LexiconStore.getStatus().phase, pool: window.__WG_TEST.dictionaryPool().length }), lexId);
    check('startup after upgrade: dictionary not opened, pool is small', pre.lexPhase === 'idle' && pre.pool < 1000, pre);
    check('(documented) a master word added before Phase 13 has progress but no in-memory entry until the index exists', pre.inVocab === false, pre);
    await page.evaluate(() => { const S = window.__WG_TEST.getState(); S.view = 'dictionary'; window.__WG_TEST.render(); });
    await page.waitForFunction(() => window.__WG_TEST.LexiconStore.getStatus().complete, null, { timeout: 600000, polling: 500 });
    await page.waitForFunction(id => !!window.__WG_TEST.getVocab().find(v => v.id === id), lexId, { timeout: 20000 }).catch(() => {});
    const post = await page.evaluate(id => ({ inVocab: !!window.__WG_TEST.getVocab().find(v => v.id === id), copies: window.__WG_TEST.getVocab().filter(v => v.id === id).length }), lexId);
    check('after the index completes, the pre-Phase-13 learned word is restored exactly once (backfill)', post.inVocab && post.copies === 1, post);
    const after = await idbInfo(page);
    check('legacy masterLexiconCache (duplicate full copy) is emptied only after the new index is complete', after.counts.masterLexiconCache === 0, after.counts);
    const snap2 = await page.evaluate(() => JSON.parse(JSON.stringify(window.__WG_TEST.getState().vocabProgress)));
    check('learning progress still identical after build + backfill', JSON.stringify(snap2) === JSON.stringify(old));
    const learned = await page.evaluate(() => DB.getAll('learnedLexicon').then(r => r.map(x => x.id)));
    check('a snapshot of the learned master word is now persisted (survives reloads independent of the big dictionary)', learned.includes(lexId), learned);
  }
  check('no page errors', errors.length === 0, errors.slice(0, 2));
  console.log(pass + ' passed, ' + fail + ' failed (upgrade ' + mode + ')'); await ctx.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.stack || e); process.exit(2); });

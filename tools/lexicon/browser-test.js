// Phase 9 real-browser smoke test (Playwright / headless Chromium).
// Run: node tools/lexicon/browser-test.js  (requires the static server at http://localhost:8899:
//      node tools/bench/static-server.js <repo> 8899).
// Phase 13: ported to the lazy IndexedDB dictionary. The assertions about eager loading ("pool size ~5.8k",
// "MasterLexiconRuntime loaded") were replaced by their Phase 13 equivalents; every UI/behaviour check is kept.
// Uses a persistent browser profile (default /tmp/wgprofile-smoke) so the one-time index build is reused.
'use strict';
const { chromium } = require('playwright');

let pass = 0, fail = 0;
function check(name, cond){ if(cond){ pass++; console.log('PASS -', name); } else { fail++; console.log('FAIL -', name); } }

(async () => {
  const ctx = await chromium.launchPersistentContext(process.env.WG_PROFILE || '/tmp/wgprofile-smoke', { headless: true, args: ['--enable-precise-memory-info'] });
  const browser = { close: () => ctx.close() };
  const page = ctx.pages()[0] || await ctx.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if(msg.type()==='error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

  await page.goto('http://localhost:8899/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__WG_TEST && window.__WG_TEST.getState().view && window.__WG_TEST.getState().view !== 'loading', null, { timeout: 15000 });

  await page.evaluate(async () => {
    await window.__WG_TEST.saveProfile({ name:'Test', goals:['General German'], styles:['Vocabulary'],
      minutesPerDay:15, difficulty:'Balanced', correction:'every', level:'A2', explainLang:'en', theme:'light' });
    window.__WG_TEST.getState().view = 'dictionary';
    window.__WG_TEST.render();
  });

  await page.waitForFunction(() => window.__WG_TEST.LexiconStore.getStatus().complete, null, { timeout: 600000, polling: 500 }).catch(()=>{});
  await page.evaluate(() => window.__WG_TEST.render());
  await page.waitForTimeout(50);

  const masterLoaded = await page.evaluate(() => window.__WG_TEST.LexiconStore.getStatus().complete);
  check('the indexed master dictionary is complete in IndexedDB (92,880 lemmas)', masterLoaded && (await page.evaluate(() => window.__WG_TEST.LexiconStore.diagnostics())).rows === 92880);

  const perf = await page.evaluate(async () => {
    const L = window.__WG_TEST.LexiconStore; const t1 = performance.now(); const r = await L.search('arbeit', { limit: 30 }); const t2 = performance.now();
    for(let i=0;i<20;i++) await L.search('arbeit', { limit: 30 }); const t3 = performance.now();
    return { firstSearchMs: +(t2-t1).toFixed(1), avgOf20SearchesMs: +((t3-t2)/20).toFixed(1), results: r.entries.length, rowsRead: r.stats.rowsRead, jsHeapUsedMB: +(performance.memory.usedJSHeapSize/1e6).toFixed(1) };
  });
  console.log('   PERFORMANCE (real Chromium, IndexedDB-backed):', JSON.stringify(perf));
  check('IndexedDB search "arbeit" averages under 100 ms', perf.avgOf20SearchesMs < 100);

  const poolSize = await page.evaluate(() => window.__WG_TEST.dictionaryPool().length);
  check('NO eager load: in-memory pool is only curated + promoted words (<1000), not the 92,880-lemma lexicon', poolSize < 1000);
  console.log('   pool size:', poolSize);

  await page.fill('#dictSearch', 'Bibliothek');
  await page.waitForTimeout(900);
  const bibliothekCard = page.locator('.panel-note:has-text("Bibliothek")').first();
  check('search finds a master-dictionary-only word (Bibliothek)', await bibliothekCard.count() > 0);
  check('master-dictionary badge is shown for that result', await page.locator('.panel-note:has-text("Bibliothek") >> text=Master Dictionary').count() > 0);

  const gehenCheck = await page.evaluate(() => {
    const res = window.__WG_TEST.UnifiedDictionaryService.search('gehen');
    const exact = res.exact.filter(v => (v.lemma||v.de).replace(/^(der|die|das) /,'') === 'gehen');
    return { count: exact.length, dictionaryOnly: exact.map(v=>!!v.dictionaryOnly) };
  });
  check('exact search for "gehen" returns exactly one record (curated precedence, no duplicate)', gehenCheck.count === 1);
  check('that one "gehen" record is the curated one, not a master-dictionary duplicate', gehenCheck.dictionaryOnly[0] === false);

  await page.fill('#dictSearch', 'Häuser');
  await page.waitForTimeout(900);
  check('typing an inflected form (Häuser) surfaces its lemma (Haus) via the real search box',
    await page.locator('.panel-note:has-text("Haus")').count() > 0);

  await page.fill('#dictSearch', 'Bibliothek');
  await page.waitForTimeout(900);
  await page.locator('.panel-note:has-text("Bibliothek")').first().click();
  await page.waitForTimeout(100);
  const addBtn = page.locator('button:has-text("Add to Learning")');
  check('detail view shows an "Add to Learning" button for a dictionary-only word', await addBtn.count() > 0);
  await addBtn.first().click();
  await page.waitForTimeout(200);
  check('after clicking Add to Learning, the button switches to "In your Learning system"',
    await page.locator('button:has-text("In your Learning system")').count() > 0);

  const promoted = await page.evaluate(() => window.__WG_TEST.getVocab().some(v => (v.lemma||v.de)==='Bibliothek'));
  check('the master word was promoted into the live VOCAB array (findable by vocabById henceforth)', promoted);

  const vocabCountAfterOne = await page.evaluate(() => window.__WG_TEST.getVocab().filter(v=>(v.lemma||v.de)==='Bibliothek').length);
  check('exactly one VOCAB entry exists for Bibliothek after one Add-to-Learning click', vocabCountAfterOne === 1);

  check('missing Urdu/Pashto shows an explicit "Translation not yet available." message, not blank',
    await page.locator('text=Translation not yet available.').count() > 0);

  await page.locator('button:has-text("Back to Dictionary")').click();
  await page.waitForTimeout(100);
  check('CEFR filter includes a real "Unknown" option (only once the master lexicon added unknown-CEFR entries)',
    await page.locator('#dictFilterLevel option[value="unknown"]').count() > 0);
  await page.selectOption('#dictFilterLevel', 'unknown');
  await page.waitForTimeout(100);
  check('filtering by CEFR=unknown only ever returns unknown-CEFR entries (indexed browse, letters a-z)', await page.evaluate(async () => {
    let total = 0;
    for(const l of 'abcdefghijklmnopqrstuvwxyz'){
      const r = await window.__WG_TEST.LexiconStore.browse(l, { limit: 40, filters: { level: 'unknown' } });
      if(!r.entries.every(v => v.level === 'unknown')) return false; total += r.entries.length;
    }
    return total > 0;
  }));

  check('no uncaught console errors during the whole flow', consoleErrors.length === 0);
  if(consoleErrors.length) console.log('   console errors:', consoleErrors.slice(0,5));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  check('Dictionary search input is visible at a 390px mobile viewport', await page.locator('#dictSearch').isVisible());

  // --- Offline reload: block all data/processed/master/* network requests
  // and confirm the master lexicon still loads (from the IndexedDB cache
  // written during the first successful load above). This is the actual
  // "previously downloaded dictionary data remains available offline"
  // claim, tested for real rather than asserted. ---
  await page.route('**/data/processed/master/**', route => route.abort());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__WG_TEST && window.__WG_TEST.getState().view && window.__WG_TEST.getState().view !== 'loading', null, { timeout: 15000 });
  await page.evaluate(async () => {
    await window.__WG_TEST.saveProfile({ name:'Test', goals:['General German'], styles:['Vocabulary'],
      minutesPerDay:15, difficulty:'Balanced', correction:'every', level:'A2', explainLang:'en', theme:'light' });
    window.__WG_TEST.getState().view = 'dictionary';
    window.__WG_TEST.render();
  });
  const offl = await page.evaluate(async () => { const L = window.__WG_TEST.LexiconStore; const st = await L.ensureReady(); const r = await L.search('Häuser', { limit: 3 }); return { phase: st.phase, top: r.entries[0] && r.entries[0].entry.lemma }; });
  check('with the network blocked for the master-lexicon files, a reload still searches the full dictionary from IndexedDB', offl.phase === 'ready' && offl.top === 'Haus');
  console.log('   offline reload:', JSON.stringify(offl));

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed (Phase 9 real-browser test, Playwright/Chromium headless)`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('BROWSER TEST CRASHED:', e); process.exit(1); });

// Phase 13 benchmark (Chromium, same conditions as bench-before.js). Measured values only.
'use strict';
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8899';
const QUERIES = ['gehen','ging','gegangen','Haus','Häuser','der Tisch','Tisch','Frau','frau','arbe','xqzvbn'];
(async () => {
  const browser = await chromium.launch({ args: ['--enable-precise-memory-info','--js-flags=--expose-gc'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  page.on('console', m => { if(m.type()==='log') console.log('  [page]', m.text()); });
  await page.addInitScript(() => { window.__t = {}; const poll = setInterval(() => { if(window.__WG_TEST && window.__WG_TEST.getState().view && document.getElementById('app').innerText.length > 20){ window.__t.shell = performance.now(); clearInterval(poll); } }, 10); });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__t.shell, null, { timeout: 30000, polling: 50 });
  const shell = await page.evaluate(() => ({ shellMs: Math.round(window.__t.shell), heapMB: +(performance.memory.usedJSHeapSize/1e6).toFixed(1) }));
  console.log('shell', JSON.stringify(shell));
  await page.evaluate(async () => { await window.__WG_TEST.saveProfile({ name:'Test', goals:['General German'], styles:['Vocabulary'], minutesPerDay:15, difficulty:'Balanced', correction:'every', level:'A2', explainLang:'en', theme:'light' }); });
  // first dictionary use -> one-time build
  const t0 = Date.now();
  const build = await page.evaluate(async () => {
    const L = window.__WG_TEST.LexiconStore; const t = performance.now(); let last = 0; const samples = [];
    const un = L.subscribe(s => { if(performance.now() - last > 10000){ last = performance.now(); console.log('progress', Math.round((performance.now() - t)/1000) + 's', s.done, 'heapMB', Math.round(performance.memory.usedJSHeapSize/1e6)); } });
    const st = await L.ensureReady(); un();
    return { ms: Math.round(performance.now() - t), status: st, samples };
  });
  console.log('build', JSON.stringify(build));
  const diag = await page.evaluate(() => window.__WG_TEST.LexiconStore.diagnostics());
  console.log('diag', JSON.stringify({ rows: diag.rows, usageMB: diag.usageMB, quotaMB: diag.quotaMB, complete: diag.build.complete, excluded: diag.build.excluded }));
  console.log('errors', JSON.stringify(errors.slice(0,5)));
  await browser.close();
})();

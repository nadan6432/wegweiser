// Baseline benchmark against the Phase 12 (eager-load) build. Measured values only.
'use strict';
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8898';
const QUERIES = ['gehen','ging','gegangen','Haus','Häuser','der Tisch','Tisch','Frau','frau','arbe','xqzvbn'];
const PROFILE = { name:'Test', goals:['General German'], styles:['Vocabulary'], minutesPerDay:15, difficulty:'Balanced', correction:'every', level:'A2', explainLang:'en', theme:'light' };

async function visit(context, label){
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  await page.addInitScript(() => {
    window.__t = {};
    const poll = setInterval(() => {
      const now = performance.now();
      if(!window.__t.shell && window.__WG_TEST && window.__WG_TEST.getState().view && document.getElementById('app') && document.getElementById('app').innerText.length > 20) window.__t.shell = now;
      if(!window.__t.dict && window.__WG_TEST && window.__WG_TEST.getMasterRuntime() && window.__WG_TEST.getMasterRuntime().isLoaded()) { window.__t.dict = now; clearInterval(poll); }
    }, 10);
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__t.shell, null, { timeout: 60000, polling: 50 });
  await page.waitForFunction(() => window.__t.dict, null, { timeout: 180000, polling: 100 });
  const base = await page.evaluate(async () => {
    if(window.gc) window.gc();
    const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
    return { shellMs: Math.round(window.__t.shell), dictReadyMs: Math.round(window.__t.dict),
      heapMB: +(performance.memory.usedJSHeapSize/1e6).toFixed(1),
      poolSize: window.__WG_TEST.dictionaryPool().length, storageUsageMB: est ? +(est.usage/1e6).toFixed(1) : null };
  });
  const searches = await page.evaluate((qs) => {
    const S = window.__WG_TEST.UnifiedDictionaryService, out = {};
    for(const q of qs){
      const t0 = performance.now(); const r = S.search(q); const first = performance.now() - t0;
      const t1 = performance.now(); for(let i=0;i<10;i++) S.search(q); const avg = (performance.now()-t1)/10;
      out[q] = { firstMs:+first.toFixed(1), avgMs:+avg.toFixed(1), total:S.totalResultCount(r),
        top: (r.exact[0]||r.inflected[0]||r.prefix[0]||{}).de || null };
    }
    return out;
  }, QUERIES);
  await page.close();
  return { label, ...base, errors: errors.slice(0,3), searches };
}

(async () => {
  const browser = await chromium.launch({ args: ['--enable-precise-memory-info','--js-flags=--expose-gc'] });
  const context = await browser.newContext();
  const cold = await visit(context, 'cold (empty IndexedDB)');
  const warm = await visit(context, 'warm (chunks cached in IndexedDB)');
  console.log(JSON.stringify({ cold, warm }, null, 1));
  await browser.close();
})();

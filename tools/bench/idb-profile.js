// Profiles IndexedDB write cost per index/field variant (used to pick the storage layout).
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.goto('http://localhost:8899/index.html'); await page.waitForTimeout(500);
  const out = await page.evaluate(async () => {
    const C = window.LexiconCore;
    const recs = await (await fetch('data/processed/master/lemmas/l.json')).json();
    let t = performance.now(); const rows = recs.map(r => C.toRow(r)); const tRow = performance.now() - t;
    async function trial(name, idxNames, mapRow){
      const dbn = 'prof_' + name; await new Promise(r => { const q = indexedDB.deleteDatabase(dbn); q.onsuccess = q.onerror = r; });
      const d = await new Promise((res, rej) => { const q = indexedDB.open(dbn, 1); q.onupgradeneeded = e => { const db = e.target.result; const s = db.createObjectStore('l', { keyPath: 'id' }); idxNames.forEach(n => s.createIndex(n, C.INDEXES[n], { multiEntry: C.MULTI.has(n) })); }; q.onsuccess = e => res(e.target.result); q.onerror = rej; });
      const data = rows.map(mapRow); const t0 = performance.now();
      for(let i = 0; i < data.length; i += 500){ const tx = d.transaction('l', 'readwrite'); const s = tx.objectStore('l'); data.slice(i, i + 500).forEach(r => s.put(r)); await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
      const ms = performance.now() - t0; d.close(); return [name, Math.round(ms)];
    }
    const id = r => r, slim = r => { const c = Object.assign({}, r); delete c.surfaceForms; delete c.inflections; delete c.senses; return c; };
    const res = [];
    res.push(await trial('noidx_full', [], id));
    res.push(await trial('all_full', Object.keys(C.INDEXES), id));
    res.push(await trial('base_full', ['lemma','k','kt'], id));
    res.push(await trial('base_f', ['lemma','k','kt','f','ft'], id));
    res.push(await trial('base_gx', ['lemma','k','kt','g','x'], id));
    res.push(await trial('base_tri', ['lemma','k','kt','tri'], id));
    res.push(await trial('all_slim', Object.keys(C.INDEXES), slim));
    return { n: rows.length, tRowMs: Math.round(tRow), res };
  });
  console.log(JSON.stringify(out)); await browser.close();
})();

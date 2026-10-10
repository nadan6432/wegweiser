const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.goto('http://localhost:8899/index.html'); await page.waitForTimeout(500);
  const out = await page.evaluate(async () => {
    const C = window.LexiconCore;
    const recs = await (await fetch('data/processed/master/lemmas/l.json')).json();
    const rows = recs.map(r => C.toRow(r));
    const del = n => new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = r; });
    const done = tx => new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
    const res = {};
    // A: bulk rows (no idx) then versionchange creating all indexes
    await del('pA'); let d = await new Promise(r => { const q = indexedDB.open('pA', 1); q.onupgradeneeded = e => e.target.result.createObjectStore('l', { keyPath: 'id' }); q.onsuccess = e => r(e.target.result); });
    let t = performance.now();
    for(let i = 0; i < rows.length; i += 500){ const tx = d.transaction('l', 'readwrite'); rows.slice(i, i+500).forEach(r => tx.objectStore('l').put(r)); await done(tx); }
    res.A_rows = Math.round(performance.now() - t); d.close(); t = performance.now();
    d = await new Promise((r, j) => { const q = indexedDB.open('pA', 2); q.onupgradeneeded = e => { const s = q.transaction.objectStore('l'); Object.keys(C.INDEXES).forEach(n => s.createIndex(n, C.INDEXES[n], { multiEntry: C.MULTI.has(n) })); }; q.onsuccess = e => r(e.target.result); q.onerror = j; });
    res.A_indexBuild = Math.round(performance.now() - t); d.close();
    // B: manual postings in a primary-keyed store: key [index, term, id]
    await del('pB'); d = await new Promise(r => { const q = indexedDB.open('pB', 1); q.onupgradeneeded = e => { const db = e.target.result; db.createObjectStore('l', { keyPath: 'id' }); db.createObjectStore('p'); }; q.onsuccess = e => r(e.target.result); });
    t = performance.now(); let entries = 0;
    for(let i = 0; i < rows.length; i += 500){ const tx = d.transaction(['l','p'], 'readwrite'); const l = tx.objectStore('l'), p = tx.objectStore('p');
      rows.slice(i, i+500).forEach(r => { l.put(r); Object.keys(C.INDEXES).forEach(n => { const v = r[C.INDEXES[n]]; if(v == null) return; (C.MULTI.has(n) ? v : [v]).forEach(k => { p.put(0, [n, k, r.id]); entries++; }); }); }); await done(tx); }
    res.B_total = Math.round(performance.now() - t); res.B_entries = entries;
    // B query speed: prefix 'arb' on k
    t = performance.now(); const keys = await new Promise(r => { const q = d.transaction('p').objectStore('p').getAllKeys(IDBKeyRange.bound(['k','arb'], ['k','arb\uffff', []])); q.onsuccess = () => r(q.result); });
    res.B_prefixQueryMs = +(performance.now() - t).toFixed(1); res.B_prefixHits = keys.length;
    d.close();
    return { n: rows.length, res };
  });
  console.log(JSON.stringify(out)); await browser.close();
})();

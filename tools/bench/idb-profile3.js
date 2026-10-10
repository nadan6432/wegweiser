const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.goto('http://localhost:8899/index.html'); await page.waitForTimeout(500);
  const out = await page.evaluate(async () => {
    const C = window.LexiconCore; const res = {};
    const del = n => new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = r; });
    const done = tx => new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
    for(const chunk of ['l', 'g']){
      const recs = await (await fetch('data/processed/master/lemmas/' + chunk + '.json')).json();
      const rows = recs.map(r => { const x = C.toRow(r); const i = [ 'l:' + x.lemma, 'k:' + x._k ]; if(x._kt) i.push('t:' + x._kt);
        (x._f||[]).forEach(k => i.push('f:' + k)); (x._ft||[]).forEach(k => i.push('u:' + k)); (x._g||[]).forEach(k => i.push('g:' + k)); (x._x||[]).forEach(k => i.push('x:' + k)); (x._t||[]).forEach(k => i.push('3:' + k));
        ['_f','_ft','_g','_x','_t','_kt'].forEach(f => delete x[f]); x._i = i; return x; });
      await del('pC' + chunk); const d = await new Promise(r => { const q = indexedDB.open('pC' + chunk, 1); q.onupgradeneeded = e => e.target.result.createObjectStore('l', { keyPath: 'id' }).createIndex('i', '_i', { multiEntry: true }); q.onsuccess = e => r(e.target.result); });
      const t = performance.now();
      for(let i = 0; i < rows.length; i += 500){ const tx = d.transaction('l', 'readwrite'); rows.slice(i, i+500).forEach(r => tx.objectStore('l').put(r)); await done(tx); }
      res[chunk] = { rows: rows.length, entries: rows.reduce((a, r) => a + r._i.length, 0), ms: Math.round(performance.now() - t) };
      const t2 = performance.now(); const ks = await new Promise(r => { const q = d.transaction('l').objectStore('l').index('i').getAllKeys(IDBKeyRange.bound('k:ge', 'k:ge\uffff')); q.onsuccess = () => r(q.result); });
      res[chunk].prefixMs = +(performance.now() - t2).toFixed(1); res[chunk].prefixHits = ks.length; d.close();
    }
    return res;
  });
  console.log(JSON.stringify(out)); await browser.close();
})();

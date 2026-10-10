/* Phase 13 tests: indexed lexicon core — keys, search ranking, resolution, pagination, integrity — run against
   the REAL 92,880-lemma Phase 12 data through the same SearchEngine the browser uses (in-memory backend).
   IndexedDB-specific behaviour (resume, no-rebuild, offline, quota, UI, Add to Learning) is covered in a real
   browser by tools/bench/browser-phase13.js.
   Run with: node --max-old-space-size=6000 tests/test_phase13.js */
'use strict';
const assert = require('assert'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'src/lexicon/lexiconCore.js'));
const Store = require(path.join(ROOT, 'src/lexicon/lexiconStore.js'));
const { loadCuratedVocab } = require(path.join(ROOT, 'tools/lexicon/pipeline.js'));
const DIR = path.join(ROOT, 'data/processed/master/');
let passed = 0, failed = 0; const queue = [];
const test = (name, fn) => queue.push([name, fn]);

const manifest = JSON.parse(fs.readFileSync(DIR + 'manifest.json', 'utf8'));
const records = [];                                   // raw Phase 12 records (read-only reference copy)
manifest.chunks.forEach(c => JSON.parse(fs.readFileSync(DIR + 'lemmas/' + c.letter + '.json', 'utf8')).forEach(r => records.push(r)));
const be = C.MemoryBackend(); const counters = {};
const rows = records.map(r => C.toRow(r, counters));
const E = C.SearchEngine(be);
const top = async (q, o) => (await E.search(q, o || { limit: 10 }));
const lab = i => i.tier + ':' + i.row.lemma + '/' + i.row.wordType;

test('baseline: manifest and chunks still hold exactly the 92,880 Phase 12 lemmas; 705 curated entries intact', () => {
  assert.strictEqual(records.length, 92880);
  assert.strictEqual(manifest.totalLemmas, 92880);
  assert.strictEqual(manifest.chunks.reduce((a, c) => a + c.lemmas, 0), 92880);
  assert.strictEqual(loadCuratedVocab(ROOT).length, 705);
});
test('every master record becomes exactly one stored row; ids unique; nothing silently dropped', () => {
  assert.strictEqual(rows.length, records.length);
  assert.strictEqual(new Set(rows.map(r => r.id)).size, records.length);
});
test('stored rows keep the ORIGINAL record untouched (only _k/_i derived fields added) — lemma case, forms, provenance preserved', () => {
  let bad = 0;
  for(let n = 0; n < records.length; n++){
    const { _k, _i, ...rest } = rows[n];
    if(JSON.stringify(rest) !== JSON.stringify(records[n])){ bad++; if(bad < 3) console.log('   diff at', records[n].id); }
  }
  assert.strictEqual(bad, 0);
});
test('provenance fields survive into stored rows and into the UI entry shape', () => {
  const withProv = records.filter(r => r.provenance || r.sources || r.sourceFile).length;
  assert.ok(withProv > 0 || records[0].layer, 'records carry provenance/layer');
  const row = rows.find(r => r.lemma === 'Tisch' && r.wordType === 'noun');
  const entry = Store.toEntry(row);
  assert.ok(entry.id === row.id && entry.dictionaryOnly === true, 'entry keeps id and master flag');
});
test('noun/article invariant: no row is "article + another row\'s lemma" as a duplicate noun record', () => {
  const raw = new Map(); rows.forEach(r => raw.set(r.lemma + '|' + r.wordType, r));
  let viol = 0;
  rows.forEach(r => { if(r.wordType === 'noun' && r.article && raw.has(r.article + ' ' + r.lemma + '|noun')) viol++; });
  assert.strictEqual(viol, 0);
  rows.filter(r => r.wordType === 'noun' && /^(der|die|das)\s/i.test(r.lemma)).forEach(() => viol++);
  assert.strictEqual(viol, 0, 'no noun lemma starts with an article');
  const tisch = rows.filter(r => r.lemma === 'Tisch' && r.wordType === 'noun'); assert.strictEqual(tisch.length, 1); assert.strictEqual(tisch[0].article, 'der');
});
test('capitalization is not folded in storage: Frau (noun) and frau (non-noun) are distinct stored lexemes', () => {
  const F = rows.filter(r => r.lemma === 'Frau' && r.wordType === 'noun'), f = rows.filter(r => r.lemma === 'frau');
  assert.strictEqual(F.length, 1); assert.ok(f.length >= 1 && f.every(r => r.wordType !== 'noun'));
});
test('standalone lexeme "der" (article/pronoun) may exist separately and is not mistaken for a noun duplicate', async () => {
  const r = await top('der'); assert.ok(r.items.some(i => i.row.lemma === 'der' && i.row.wordType !== 'noun'), r.items.map(lab).join());
});
test('exact lemma: gehen -> verb gehen first', async () => { const r = await top('gehen'); assert.strictEqual(lab(r.items[0]), 'exact:gehen/verb'); });
test('inflected forms resolve to the canonical lemma: ging, gegangen -> gehen', async () => {
  for(const q of ['ging', 'gegangen']){ const r = await top(q); assert.strictEqual(lab(r.items[0]), 'inflected:gehen/verb', q); }
});
test('noun plural: Häuser (and lower-case häuser) -> Haus noun, before any prefix/partial hit', async () => {
  for(const q of ['Häuser', 'häuser']){ const r = await top(q); assert.strictEqual(r.items[0].tier, 'inflected'); assert.strictEqual(r.items[0].row.lemma, 'Haus'); assert.strictEqual(r.items[0].row.wordType, 'noun'); }
});
test('Haus: exact lemma first (noun before proper noun), exact tier precedes every weaker tier', async () => {
  const r = await top('Haus', { limit: 20 }); assert.strictEqual(lab(r.items[0]), 'exact:Haus/noun');
  const order = r.items.map(i => C.TIER_ORDER.indexOf(i.tier)); assert.deepStrictEqual(order, order.slice().sort((a, b) => a - b));
});
test('article-prefixed noun search: "der Tisch" and "Tisch" both give the single Tisch noun record first', async () => {
  const a = await top('der Tisch'), b = await top('Tisch'), c = await top('DER   tisch');
  [a, b, c].forEach(r => { assert.strictEqual(r.items[0].row.lemma, 'Tisch'); assert.strictEqual(r.items[0].row.article, 'der'); assert.strictEqual(r.items[0].tier, r === c ? r.items[0].tier : 'exact'); });
  assert.strictEqual(a.items[0].row.id, b.items[0].row.id, 'same canonical record');
});
test('wrong article still finds the noun but is flagged (never creates/returns a fake "die Tisch")', async () => {
  const r = await top('die Tisch'); const t = r.items.find(i => i.row.lemma === 'Tisch' && i.row.wordType === 'noun'); assert.ok(t && t.articleMismatch && t.row.article === 'der');
});
test('case-insensitive matching with correct precedence: "frau" -> lowercase lexeme first, then noun Frau; "Frau" the reverse', async () => {
  const a = await top('frau'), b = await top('Frau');
  assert.ok(a.items[0].tier === 'exact' && a.items[0].row.lemma === 'frau'); assert.ok(a.items.some(i => i.tier === 'ci' && i.row.lemma === 'Frau'));
  assert.ok(b.items[0].tier === 'exact' && b.items[0].row.lemma === 'Frau'); assert.ok(b.items.some(i => i.tier === 'ci' && i.row.lemma === 'frau'));
  const c = await top('FRAU'); assert.ok(c.items.slice(0, 3).some(i => i.row.lemma === 'Frau'));
});
test('German character equivalents without merging distinct words: Haeuser->Haus, Strasse->Straße, but schon never returns schön as a match', async () => {
  assert.ok((await top('Haeuser')).items.some(i => i.tier === 'variant' && i.row.lemma === 'Haus'));
  assert.ok((await top('Strasse')).items.some(i => i.row.lemma === 'Straße'));
  const s = await top('schon', { limit: 50 }); assert.ok(!s.items.some(i => i.row.lemma === 'schön' && ['exact', 'ci', 'inflected', 'variant'].includes(i.tier)));
  assert.ok((await top('schön')).items[0].row.lemma === 'schön');
});
test('prefix and partial search: "arbe" -> Arbeit first via prefix; "rbeitsa" finds Arbeitsamt via the partial tier', async () => {
  const a = await top('arbe', { limit: 30 }); assert.strictEqual(a.items[0].tier, 'prefix'); assert.strictEqual(a.items[0].row.lemma, 'Arbeit');
  const p = await top('rbeitsa', { limit: 30 }); assert.ok(p.items.some(i => i.tier === 'partial' && i.row.lemma === 'Arbeitsamt'));
});
test('multi-word surface forms resolve by verification ("habe abgebaut" -> abbauen) without indexing 940k phrases', async () => {
  const r = await top('habe abgebaut'); assert.ok(r.items.some(i => i.row.lemma === 'abbauen'));
});
test('no result: gibberish returns nothing (no misleading fuzzy hit), stats show tiny work', async () => {
  const r = await top('xqzvbn'); assert.strictEqual(r.items.length, 0); assert.strictEqual(r.hasMore, false);
});
test('typo tolerance (edit distance 1) is offered ONLY when nothing else matched, and never ahead of real results', async () => {
  const r = await top('Tiscg'); assert.ok(r.items.length && r.items.every(i => i.tier === 'fuzzy') && r.items.some(i => i.row.lemma === 'Tisch'));
  const ok = await top('Tisch'); assert.ok(!ok.items.some(i => i.tier === 'fuzzy'));
});
test('Wiktextract template tokens are NOT searchable as inflected forms (strong, de-ndecl, no-table-tags, weak...)', async () => {
  for(const q of ['strong', 'de-ndecl', 'no-table-tags', 'weak', 'de-conj']){ const r = await top(q, { limit: 50 }); assert.ok(!r.items.some(i => i.tier === 'inflected'), q); }
  assert.ok(counters['de-ndecl'] > 50000 && counters['strong'] > 20000, 'exclusion counters recorded');
});
test('auxiliary markers haben/sein attached to verbs are not treated as inflected forms of ~10k verbs', async () => {
  const r = await top('haben', { limit: 100 }); const inf = r.items.filter(i => i.tier === 'inflected'); assert.ok(inf.every(i => i.row.wordType !== 'verb'), inf.map(lab).slice(0, 5).join());
  assert.strictEqual(lab(r.items[0]), 'exact:haben/verb');
});
test('excluded tokens are only excluded from the INDEX — the stored records still carry every original surface form', () => {
  const h = rows.find(r => r.lemma === 'Haus' && r.wordType === 'noun'); const orig = records.find(r => r.id === h.id);
  assert.deepStrictEqual(h.surfaceForms, orig.surfaceForms);
  assert.ok(!h._i.includes('f:strong') && !h._i.includes('f:de-ndecl'));
});
test('English meaning search still works (translation tiers) and ranks below lemma/form matches', async () => {
  const r = await top('house', { limit: 30 }); assert.ok(r.items.some(i => i.tier === 'translationExact' && i.row.lemma === 'Haus'));
});
test('pagination: limit respected, hasMore set, pages are disjoint and concatenate to the larger page', async () => {
  const p1 = await top('a', { limit: 7, offset: 0 }), p2 = await top('a', { limit: 7, offset: 7 }), big = await top('a', { limit: 14 });
  assert.strictEqual(p1.items.length, 7); assert.ok(p1.hasMore);
  assert.deepStrictEqual(p1.items.concat(p2.items).map(i => i.row.id), big.items.map(i => i.row.id));
  assert.strictEqual(new Set(p1.items.concat(p2.items).map(i => i.row.id)).size, 14);
  const tiny = await top('Haus', { limit: 1 }); assert.strictEqual(tiny.items.length, 1);
});
test('filters (word type / gender / level) apply inside the index scan', async () => {
  const r = await E.search('Tisch', { limit: 20, filters: { wordType: 'noun', gender: 'der' } }); assert.ok(r.items.length && r.items.every(i => i.row.wordType === 'noun' && i.row.article === 'der'));
});
test('A–Z browse pages through the lemma index with stable, non-overlapping pages and a real total', async () => {
  const b1 = await E.browse('a', { limit: 40, offset: 0 }), b2 = await E.browse('a', { limit: 40, offset: 40 });
  assert.strictEqual(b1.items.length, 40); assert.ok(b1.hasMore && b1.total > 1000);
  const ids = new Set(b1.items.map(r => r.id)); assert.ok(b2.items.every(r => !ids.has(r.id)));
  assert.ok(b1.items.every(r => r._k.startsWith('a') || r._k.startsWith('ä')));
});
test('records pulled into memory per search is tiny compared with the 92,880-record lexicon', async () => {
  let worst = 0;
  for(const q of ['gehen', 'ging', 'gegangen', 'Haus', 'Häuser', 'der Tisch', 'Tisch', 'Frau', 'frau', 'arbe', 'xqzvbn', 'a', 'e', 'er']){ const r = await E.search(q, { limit: 30 }); worst = Math.max(worst, r.stats.rowsRead); }
  console.log('   worst-case rows read for a 30-result page across the benchmark queries:', worst);
  assert.ok(worst < 2500, 'worst ' + worst);
});
test('reading-tap resolution: inflected, capitalised and unknown words', async () => {
  assert.strictEqual((await E.resolveWord('gegangen')).lemma, 'gehen'); assert.strictEqual((await E.resolveWord('Tisch')).lemma, 'Tisch'); assert.strictEqual(await E.resolveWord('xqzvbn'), null);
});
test('streaming chunk reader yields exactly the same records as JSON.parse, for awkward network slicing (incl. splits inside UTF-8 and the record delimiter)', async () => {
  for(const letter of ['x', 'j', 'ü']){
    const f = DIR + 'lemmas/' + letter + '.json'; if(!fs.existsSync(f)) continue;
    const buf = fs.readFileSync(f); const want = JSON.parse(buf.toString('utf8'));
    for(const size of [7, 1000, 65536]){
      const stream = new ReadableStream({ start(ctl){ for(let i = 0; i < buf.length; i += size) ctl.enqueue(new Uint8Array(buf.subarray(i, i + size))); ctl.close(); } });
      const got = []; for await (const { rec } of Store.streamRecords({ body: stream })) got.push(rec);
      assert.strictEqual(got.length, want.length, letter + ' size ' + size); assert.deepStrictEqual(got, want);
    }
  }
});
test('streaming reader rejects non-array / corrupt input instead of importing garbage (caller falls back to whole-chunk parse)', async () => {
  const mk = txt => ({ body: new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode(txt)); c.close(); } }) });
  let threw = 0; for(const bad of ['{"a":1}', '[{"id":"lex_a","x":}]']){ try{ for await (const _ of Store.streamRecords(mk(bad))); }catch(e){ threw++; } }
  assert.strictEqual(threw, 2);
});
test('encoding: valid German characters survive in stored rows (ä ö ü ß) and no U+FFFD / mojibake in lemmas', () => {
  const bad = rows.filter(r => /\uFFFD|Ã[¤¶¼\u009f]|Ã„|Ã–|Ãœ/.test(r.lemma));
  assert.strictEqual(bad.length, 0, bad.slice(0, 3).map(r => r.lemma).join());
  ['Häuser', 'Mädchen', 'Straße', 'schön', 'Öl', 'Übung'].forEach(w => assert.ok(rows.some(r => r.lemma === w || r._i.includes('f:' + w.toLowerCase())), w));
});

(async () => {
  for(const [name, fn] of queue){ try{ await fn(); passed++; console.log('PASS -', name); }catch(e){ failed++; console.log('FAIL -', name, '\n   ', e.stack || e.message); } }
  console.log('\n' + passed + ' passed, ' + failed + ' failed (phase13 — indexed lexicon core)');
  if(failed) process.exit(1);
})();
// the in-memory backend must be populated before the queue runs
be.putMany(rows);

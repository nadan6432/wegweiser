# WEGWEISER PHASE 9 — MASTER DICTIONARY INTEGRATION & SEARCH ENGINE

## 1. Files inspected
`app.js`, `db.js`, `srs.js`, `index.html`, `src/services/dictionary.js`,
`src/services/learning.js`(none exists — learning/SRS logic lives in
`app.js`'s `getVocabItem`), `src/repositories/repositories.js`,
`src/core/schema.js`, `tools/lexicon/pipeline.js`, `tools/lexicon/streaming.js`,
`tools/lexicon/build-authored.js`, `data/processed/master/manifest.json`
+ sample chunk files, `PHASE8_REPORT.md`, `SOURCE_LICENSE.md`,
`DATA_SOURCES.md`, `tests/test_dictionary.js`, `tests/test_phase5.js`,
`tests/test_phase6.js`.

**Verified baseline (not assumed):** curated = 705 (sum of the four
`vocabulary.*.js` packs), master lemmas = 5,105 (manifest.json), 168
pre-existing tests passing. All confirmed by running the actual code, not
by trusting the prior report's numbers.

## 2. Files changed
- `src/services/dictionary.js` — refactored into a factory
  (`createDictionaryService(getPool, getExtraFormIndex)`); the original
  singleton behavior is preserved exactly (`DictionaryService = 
  Object.assign(createDictionaryService(() => R.vocab()), {create:...})`).
  `bucketLetter` fixed (see §14 data-quality note below).
- `src/services/masterLexiconRuntime.js` — **new.** Node loader
  (`loadAllNode`), VOCAB-shape normalizer (`toDictionaryEntry`),
  curated-precedence merge (`mergedPool`), surface-form index
  (`buildFormIndex`), and the browser runtime (`MasterLexiconRuntime`:
  fetch + IndexedDB cache, graceful missing/corrupt-chunk handling).
- `db.js` — `DB_VERSION` 2→3, added `masterLexiconCache` object store
  (purely additive; every existing store and its data is untouched).
- `index.html` — one new `<script>` tag for the runtime file.
- `app.js` — unified pool/service wiring (`dictionaryPool`,
  `UnifiedDictionaryService`, `dictEntryById`, `dictFilterWordTypes`,
  `dictHasUnknownCefr`), Dictionary screen updated (source badges,
  missing-translation messaging, CEFR-basis note, dynamic filter options),
  `dict-add-review` handler extended to promote a master-only word into
  `VOCAB` before creating its SRS record, one `boot()` addition (async,
  non-blocking master-lexicon load), and a `window.__WG_TEST` debug hook
  used only by the Playwright test (see §12).
- `tests/test_phase9.js` — **new**, 34 tests.
- `tools/lexicon/browser-test.js` — **new**, real Playwright browser test.

## 3. Architecture of the integrated search service
```
curated VOCAB (705, from Registry.apply())        master lexicon (5,105,
        │                                           chunked JSON files)
        │                                                   │
        │                          MasterLexiconRuntime.init() [browser]
        │                          fetch manifest → fetch/cache each     
        │                          per-letter chunk (IndexedDB-cached)   
        │                                                   │
        │                              toDictionaryEntry()  │ normalize to
        │                                                   ▼ VOCAB shape
        └──────────────────►  mergedPool(curated, master)  ◄┘
                  curated-precedence dedup by normalized lemma+word-type
                                       │
                          UnifiedDictionaryService
                    = DictionaryService.create(dictionaryPool, formIndex)
                     (the SAME search/browse/filter engine the app has
                      always used — a second configured instance, zero
                      changes to the default singleton's behavior)
                                       │
                     renderDictionary / dictResultCard / detail view
                       (existing rendering code, now fed a bigger pool)
```
Add to Learning: `dictEntryById(id)` → if master-only and not yet in
`VOCAB`, push its normalized entry into `VOCAB` once (idempotent, checked
by id) → the *existing, unchanged* `getVocabItem()` get-or-create SRS
pattern runs exactly as it already did for curated words.

## 4. Actual dataset counts, before and after
| | Before Phase 9 | After Phase 9 (merged pool) |
|---|---|---|
| Searchable/browsable entries | 705 (curated only) | **5,797** (Node-measured) / **5,806** (real browser — see note) |
| Master-lexicon entries excluded as curated duplicates | — | 13 |
| Word classes covered | 11 (Schema.WORD_TYPES) | 17 (+subjunction, modal_particle, proper_noun, plus number/article now populated at scale) |

By word class in the merged pool (Node-measured):
noun 2,823 · verb 1,049 · adjective 660 · adverb 361 · phrase 352 ·
proper noun 162 · idiom 82 · number 60 · preposition 60 · pronoun 39 ·
conjunction 28 · subjunction 21 · interjection 54 · particle 17 ·
determiner 16 · article 8 · modal particle 5. CEFR-unknown in the merged
pool: **3** (a few of the tiny real Phase 6B sourced records; the 5,101
Phase 8 authored records all carry an author-estimate CEFR, not "unknown").

**Note on 5,797 vs 5,806:** the Node tooling's `loadCuratedVocab()` sums
only the four `vocabulary.*.js` packs (705); the live browser's `VOCAB`
is built by `Registry.apply()`, which also merges a handful of entries
from the legacy `data.js`/`content2.js` files — a discrepancy already
flagged in Phase 6A's own audit (705 vs. the previously-reported "753").
Both 5,797 and 5,806 are real, measured numbers from their respective
environments; the 9-record gap is that pre-existing legacy-merge
difference, not something Phase 9 introduced.

## 5. Word-class coverage
All 17 categories present in the actual dataset are filterable (§3 spec
list items not present in the data — e.g. "abbreviation" — are correctly
absent from the filter dropdown, not shown as an empty fake option).

## 6. Search features verified (real browser + Node)
Exact, case-insensitive, prefix/partial, English/Urdu/Pashto translation
search, surface-form→lemma lookup (both the curated `IRREGULAR_FORMS`
table and the master lexicon's own real per-word `surfaceForms`, merged),
word-class filter, CEFR filter including a real "Unknown" option,
alphabetical A–Z browsing, curated-vs-master source labeling, NFC/umlaut/ß
handling. All verified against the **real 5,105-entry dataset**, not a
synthetic fixture (fixtures were used only for the two cases needing a
shape that doesn't exist in the real data yet: a same-spelling
different-word-class homograph, and a corrupt-chunk simulation).

## 7. Curated-data preservation results
- 705/705 curated entries present, unmodified, after the merge (`gehen`'s
  real example sentence and `Haus`'s real Urdu/Pashto verified byte-exact
  post-merge, both in Node tests and live in the real browser).
- 0 curated entries overwritten, 0 duplicated.
- 13 master-lexicon records correctly suppressed as curated duplicates
  (e.g. authored `weil` as "subjunction" correctly yields to curated
  `weil` as "conjunction" — same word, curated wins, no double entry).

## 8. SRS and favorite preservation results
- `getVocabItem()` (the existing get-or-create) is completely unchanged;
  Phase 9 only decides *whether* an id needs promoting into `VOCAB`
  first, never touches SRS internals.
- Idempotency and due-date preservation verified for a **promoted
  master-lexicon word**, not just curated ones (tests #16–17), and
  end-to-end in the real browser (add-to-learning twice → exactly one
  `VOCAB` row, button correctly shows "In your Learning system").
- Favorites use the same `'v:'+id` key scheme regardless of origin — no
  new code path was needed or added.

## 9. Performance measurements (real Chromium via Playwright — not estimated)
| Metric | Value |
|---|---|
| Page load (cold) | 224–345 ms (two runs) |
| Master-lexicon cold fetch (29 requests) | ~440–520 ms, **5.19 MB** over the wire |
| Search latency, curated-only pool (705) | 0.69–0.74 ms avg (50 runs) |
| Search latency, unified pool (5,806) | 2.95–3.63 ms avg (50 runs) |
| JS heap after full load | 17–22 MB |
| Offline reload (network blocked) pool size | 5,806 — full dictionary, from IndexedDB cache |

**Honest read:** search got ~4× slower in absolute terms (sub-1ms →
sub-3ms) but is still far below any perceptible-lag threshold (~100 ms).
The 5.19 MB one-time download is the real cost of Phase 9 — acceptable
for a one-time, cached, offline-first load, but worth knowing exactly
(not "should be fine").

## 10. Offline behavior verified
Real test (not simulated): after a successful first load, all
`data/processed/master/**` network requests were blocked
(`page.route(...).abort()`) and the page reloaded — the dictionary still
loaded all 5,806 entries from the `masterLexiconCache` IndexedDB store.
Missing individual chunk files and a corrupt (malformed JSON) chunk are
both handled without crashing the whole load (Node tests #21/#21b).

## 11. Unit-test results
**202 passed, 0 failed** total:
- 127 pre-existing (Phases 1–6A untouched areas)
- 41 Phase 6/6B (untouched)
- 34 new Phase 9 (`tests/test_phase9.js`) — all 22 spec-listed scenarios
  covered at the service/data layer, plus 2 baseline-verification tests
  and a Node-side performance sanity check.

## 12. Browser-test results — ACTUALLY PERFORMED
Playwright + headless Chromium (`playwright` is installed in this
environment) was used for a genuine browser run, not a simulation:
`node tools/lexicon/browser-test.js` against the real `index.html` served
over `http://localhost:8899` by a throwaway static file server.
**17 passed, 0 failed**, covering: real page boot, real async master-lexicon
fetch, real search-box typing with debounce, a real click through to the
detail view, a real "Add to Learning" click and its idempotency, real
CEFR-filter DOM interaction, a real 390px mobile viewport check, zero
uncaught console errors, and the real offline-reload-from-cache scenario
above. A `window.__WG_TEST` hook was added to `app.js` purely so the test
could call `saveProfile()`/`render()` directly instead of scripting the
full onboarding wizard — it exposes no new capability, only read access
to what the module scope already computes.

**This is a real, executed browser test — not a unit test relabeled, and
not a claim without a run.** The full console output of both runs (before
and after the `bucketLetter` fix below) is reproducible via the command
above.

## 13. Remaining limitations
- **9-record VOCAB-count discrepancy** between the Node tooling and the
  live browser (§4) — pre-existing (Phase 6A), not fixed here; fixing it
  means reconciling `loadCuratedVocab()` with `Registry.apply()`'s legacy
  `data.js`/`content2.js` merge, out of this phase's scope.
- **Senses are not shown as a separate structured list** in the detail
  view for master-lexicon words — multiple senses are already folded into
  one semicolon-joined `en` string at data-build time (Phase 8), and
  Phase 9 did not reshape `wordProfileBody` to support two different
  sense shapes (curated's `{en, example}` vs. master's `{glosses, tags}`)
  side by side. Low risk, but a real simplification.
- **Related-words/synonyms UI**: the fields (`synonyms`, `opposites`,
  `collocations`) are normalized and present on master entries where the
  source had them (rare — mostly empty for Phase 8 authored data), but no
  new UI section was added beyond what `wordProfileBody` already renders
  for curated words.
- **No service-worker / prebuilt combined search index** — the offline
  path relies on IndexedDB chunk caching plus an in-memory linear-scan
  search (fast enough at this scale per §9, but would need a real inverted
  index before this approach would still be fast at, say, 100k+ entries).
- The `window.__WG_TEST` hook is test scaffolding left in `app.js`; it's
  inert for real users (no UI calls it) but should be stripped or guarded
  behind a build flag before any production deployment.

## 14. Data-quality issue found and fixed this phase (would have needed a German-language-adjacent review otherwise)
`DictionaryService.bucketLetter()` stripped a leading "der/die/das" from
**any** string, including full-sentence phrases. This was harmless while
the pool was curated-only (few such phrases), but once Phase 8's ~350
authored phrases entered the pool, real sentences like "Das kommt darauf
an." were mis-bucketed under **K** (from "kommt") instead of **D**. Fixed
by only stripping the article for noun-type entries; regression-tested
(`test_phase9.js` #22b) and confirmed live in the real browser. This was
caught precisely because Phase 9 ran real tests against real data at
real scale rather than trusting the pipeline's earlier validator (which
had no reason to check cross-entry alphabetical bucketing).

## 15. ZIP filename
`wegweiser-phase9-dictionary-integration.zip`

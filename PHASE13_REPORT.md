# PHASE 13 REPORT — Dictionary performance, search & data integrity

All numbers below were **measured** in this sandbox (headless Chromium via Playwright, one machine, no mobile device).
Raw logs are in `tools/bench/results-phase13/`. Estimates are labelled as estimates. Nothing was re-downloaded, re-imported
or regenerated: `data/` and `src/content/` are byte-identical to Phase 12 (`diff -r` against the untouched upload).

## 0. Verified Phase 12 baseline
Inspected directly: 92,880 lemma records in 31 per-letter chunk files (`data/processed/master/lemmas/*.json`, minified JSON arrays),
705 curated entries, 214 tests passing before any change (re-run: 214/214), `forms/*.json` present but unused by the runtime.
**Not found in the repository: a service worker and a PWA manifest** (no `sw.js`, no `manifest.webmanifest`, no `caches.*` use).
So "service worker caching of dictionary assets" did not exist; Phase 9's offline story was an IndexedDB copy of each chunk (`masterLexiconCache`).

## 1. Actual bottlenecks (measured on the untouched Phase 12 build)
| Metric (Chromium, fresh context, same machine) | cold | warm (chunks cached in IDB) |
|---|---|---|
| App shell visible | 462 ms | 357 ms |
| Dictionary ready (eager load of all 93,019 records) | **9,098 ms** | **5,573 ms** |
| JS heap after load | **303 MB** | **288 MB** |
| Search (avg of 10, 11 test queries) | 198–262 ms | 203–277 ms |
| Records resident in JS memory | 93,019 | 93,019 |
| IndexedDB usage (duplicate chunk cache) | 43 MB (Chromium's compressed estimate) | 43 MB |
Causes: (1) whole lexicon fetched, `JSON.parse`d and merged into one array on every start; (2) every search is a linear scan over that array
(sync, main thread); (3) a second full copy of the data lives in `masterLexiconCache`; (4) the user-DB backup (`exportAll`) includes that cache.
Phase 12 reported 88 ms/search; on this machine the same code measured ~200–270 ms (different hardware) — compare only like with like.
Correctness defects also found in the baseline: `der Tisch` returned 1 result and **not** Tisch; `frau` ranked the noun `die Frau` above the exact lowercase lexeme.

## 2. Files changed
| File | Change |
|---|---|
| `src/lexicon/lexiconCore.js` (new) | key normalisation, row/index builder, ranked SearchEngine, test backend |
| `src/lexicon/lexiconStore.js` (new) | IndexedDB store, streaming resumable build, status/progress, search/browse/getEntry API |
| `app.js` | no eager load; async master panel with progress/empty/error states; Add-to-Learning dedupe + persistence; reading-tap fallback; double-article display fix |
| `db.js` | v3 → v4, additive store `learnedLexicon` |
| `index.html` | two script tags |
| `tests/test_phase13.js` (new) | 31 Node tests on the real 92,880-lemma data |
| `tools/bench/*` (new) | static server, browser verification (`build`/`warm`/`resume`), upgrade-path test, baseline + IDB profiling scripts |
| `tools/lexicon/browser-test.js` | ported from "eager pool" assertions to the lazy store (all UI checks kept) |
| `ARCHITECTURE.md` | short Phase 13 section |
Unchanged: `data/`, `src/content/`, `src/services/dictionary.js`, `src/services/masterLexiconRuntime.js`, SRS/engine/repository code.

## 3. Storage & indexing strategy
* Separate DB `wegweiser_lexicon` (own versioning); the user's `wegweiser_db` is never cleared or rewritten.
* One copy of the data: `lemmas` store = the untouched Phase 12 record + derived fields `_k` (folded lemma) and `_i` (index keys). No Cache Storage copy, no in-memory copy. Stored lemmas are never case-folded (`Frau` ≠ `frau`).
* **One combined multiEntry index** `i` with prefixed keys: `l:` exact lemma, `k:` case-insensitive lemma, `t:` ae/oe/ue/ss spelling, `f:` single-word inflected form, `u:` ae/oe/ue/ss form, `g:` English gloss, `x:` Urdu/Pashto segment. Measured while designing (`tools/bench/idb-profile*.js`, 3,099 rows): no index 0.34 s; 3 separate indexes 2.8 s; all 8 separate indexes 3.8 s; bulk-creating indexes after load 3.4 s; a hand-built postings store 20 s. Index *entries* dominate cost, so trigram entries (>50% of all entries) were dropped.
* Substring and typo search use a **compact key projection** (`keytab`, one packed string per source chunk, ≈ 3 MB total, scanned with native `indexOf`, one chunk at a time, no lexicon record read). This is a key list, not the dictionary, but it is a scan, not an index lookup — see limitations.
* Multi-word forms (`habe abgebaut`, ~940k of the 1.5M surface forms) are **not** indexed; they resolve by looking up the last token and verifying against the record's stored forms.
* Search tiers (deterministic): exact lemma → case-insensitive → inflected form → spelling variant → English meaning → prefix → meaning prefix → substring → edit-distance-1 suggestions (only when nothing else matched). Article-prefixed queries strip `der/die/das`, prefer a noun whose article matches, and flag a wrong article instead of inventing a record. Results are paged (`limit`/`offset`, `hasMore`) and stale searches are discarded by sequence number.
* **Data defect found and handled (documented, minimal, testable):** Wiktextract template/table markers leaked into `surfaceForms`: `de-ndecl` 54,756 lemmas, `no-table-tags` 37,555, `strong` 26,409, `de-conj` 9,832, `de-adecl` 13,870, `weak` 8,779, `neuter` 1,685, `irregular` 170, … plus the auxiliary markers `haben` (9,062) / `sein` (1,419) attached to verbs. They made `strong` resolve to 26k nouns. The records are **left untouched**; those tokens are only excluded from the form index (counts stored in the build metadata; tests assert both the exclusion and that the stored forms are unchanged).
* The encoding repair was not touched; tests confirm valid ä ö ü ß in stored rows and no U+FFFD/mojibake in lemmas.
* Build: chunks are streamed record-by-record (split on the record boundary, each record `JSON.parse`d separately — equivalence with whole-file parse tested with 7-byte network slices; any anomaly falls back to a whole-chunk parse), written in 500-row transactions, chunk marked done only after its count matches the manifest.

## 4. Migrations & compatibility
* `wegweiser_db` 3 → 4 adds only `learnedLexicon`; verified on a real Phase 12 state (`upgrade-path.log`): progress byte-identical, cache emptied only after the new index is complete.
* `wegweiser_lexicon` v1 is created on first use. Lexicon schema/data-version change ⇒ rebuild of that DB only (background, after the old index has been served).
* Interrupted build: resumes per chunk; the app stays usable, partial results are flagged. A failed build is not retried by keystrokes/re-renders (explicit "Try again" or next launch).
* Words added to Learning **before** Phase 13 had progress but their entry only lived in memory (lost on reload in Phase 12). They are now restored from the index once it exists; new additions are snapshotted in `learnedLexicon`.
* Behaviour change to note: the reading "target vocabulary" extraction (`resolveClickedWord`) now resolves against curated + added words only (previously the full master pool), consistent with "searching the master dictionary must not feed lessons". Tapping an unknown word in a reading still falls back to an async master lookup.

## 5. Before / after (measured)
| | Phase 12 | Phase 13 |
|---|---|---|
| App shell visible | 357–462 ms | 253–459 ms typical (1,387 ms once, brand-new browser profile) |
| Dictionary needed before first result | 5.6–9.1 s (eager) | warm: open 1.7–31.7 ms, first search 35–133 ms; first-ever use: partial results after ≈0.35 s, complete index in 32–54 s |
| JS heap at shell / after UI use | 288–303 MB | 5–8 MB / 7–11 MB |
| Records in JS memory | 93,019 | 0 at startup; 4–151 rows read per 30-result search |
| Search (avg of 10, 30-result page) | 198–277 ms | gehen 30, ging 24, gegangen 27, Haus 10, Häuser 29, der Tisch 30, Tisch 33, Frau 3, frau 3, arbe 8, no-result query 53 ms (final run; other runs 2–45 ms, once 105 ms before the typo search was rewritten) |
| Storage | 43 MB estimate (+ duplicate cache) | 110–112 MB estimate for the index (single copy), legacy cache emptied |
| First-time index build | n/a | 32.4 / 42.1 / 53.5 s (persistent profile); **211 s in an ephemeral/incognito-style context**; JS heap peak 21–43 MB |
Targets: shell ≈2 s ✔; typical search <100 ms ✔ (in this headless run); much lower startup memory ✔. The one-time build is the cost; it is background, resumable and does not block the UI, but it is long on slow/ephemeral storage.

## 6. Tests
* Node: **245/245 pass** — 214 existing (unchanged, none weakened) + 31 new (`tests/test_phase13.js`): curated 705 intact; one row per record; stored records untouched; noun/article invariant; Frau/frau; gehen/ging/gegangen; Häuser; der Tisch/Tisch/wrong article; ae/oe/ue/ss without merging schon/schön; prefix/partial; multi-word forms; no-result; typo only when nothing else; template-token exclusion; haben/sein; English meaning; pagination; filters; A–Z browse; rows-read bound (worst 160); reading-tap; streaming-parser equivalence/rejection; encoding.
* Real browser (not part of the unit suite; need Chromium + `node tools/bench/static-server.js . 8899`): `build` 4/4, `warm` 32/32, `resume` 9/9 (mid-chunk interrupt, interrupt after reload, simulated quota error, final resume fetched only the 26 missing chunks, exact 92,880 rows, no duplicates), ported Phase 9 smoke test 18/18, upgrade path 2 + 9.
* Bugs the browser tests caught in my own first draft, fixed: crash on empty dictionary key; curated-precedence filter applied to the wrong object (duplicates shown); a failed build re-triggered by every re-render; the index waiting on the network even when complete; duplicate article display (this one pre-existed in Phase 12: "das das Haus").

## 7. Curated data & learning progress
Curated vocabulary: 705 entries unchanged (`src/content/` identical; test). Existing progress/SRS: byte-identical after upgrade (test). Searching/opening the dictionary added 0 progress records (test). Add to Learning: one canonical record + one progress item even when clicked 3×; a master record that is the same word as a curated entry resolves to the curated record (no duplicate); promoted word + progress survive a reload without opening the big dictionary.

## 8. Offline
Verified: network disabled + store reopened → ready from IndexedDB and searches resolve; full page reload with every `/data/` request aborted → search still works; reopening makes 0 chunk requests; startup makes 0 chunk requests; the complete index no longer waits on the network (version check runs in the background). **Not verified:** reloading the app *shell* offline — there is no service worker in the repo, so that depends on the host/browser cache, not on this phase.

## 9. Limitations & next steps
* No service worker/manifest exists; add one (precache the app shell only, never `data/`) to make the installed PWA start offline.
* First use needs one online visit to build the index (≈110 MB). Quota exhaustion was only *simulated* (put throws `QuotaExceededError`); no real full-disk test.
* Substring and typo search scan the ≈3 MB key projection (≈20–50 ms here); fine at 93k lemmas, would need a real index at much larger scale. Typo tolerance is edit distance 1 only, suggestions only.
* Urdu/Pashto master translations are matched exactly (whole string or `;`/`,` segment) only; the 705 curated entries keep the full Phase 4 matching. English glosses support exact + prefix, not substring.
* A–Z lists umlaut words after their base letter (code-point order, not German collation).
* Words added to Learning before Phase 13 stay "orphaned" until the index first completes (opening the dictionary does it).
* Not tested: Safari/Firefox, real mobile hardware, two tabs building simultaneously (`navigator.locks` path), a real lexicon version bump (rebuild path), screen readers on the new progress banner (it has `role=status`).
* `masterLexiconRuntime.js` still contains the old eager loader (used by Node tooling/tests); the app does not call it. Candidate for removal in a cleanup phase.

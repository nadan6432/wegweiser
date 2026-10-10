# WEGWEISER PHASE 10 — COMPLETE GERMAN MASTER VOCABULARY

## THE DIRECT ANSWER (spec §33)

> **Did we actually acquire and integrate a genuinely broad German lexical
> dataset, or are we still working with a small sample?**

**We are still working with a small sample.** No new bulk dataset was
acquired this phase. The master lexicon is unchanged from Phase 8/9:
5,105 lemmas (5,101 hand-authored + 4 real records sourced from kaikki.org
in Phase 6B). Nothing was added to it this phase. This phase's real,
verifiable work was (a) a fresh, harder attempt at acquisition, honestly
reported as still blocked, and (b) fixing/proving the article-duplication
architecture the spec was specifically worried about, which turned out to
already be correct — verified with new tests, not just asserted.

## 1. Acquisition attempt this phase (network re-tested, not assumed)

**bash egress, re-tested fresh:**
```
$ curl -s -m 6 -D - https://datasets-server.huggingface.co
HTTP/2 403
x-deny-reason: host_not_allowed
```
Same result for `huggingface.co`, `kaikki.org`, `raw.githubusercontent.com`,
`github.com`, `api.github.com`, `dumps.wikimedia.org`. The allow-list is
unchanged from Phases 6B/7/8.

**New avenue tried this phase:** Hugging Face's `datasets-server` paginated
rows API (`/rows?dataset=...&config=...&split=...&offset=...&length=...`),
which returns small JSON pages without downloading the full file — a
genuinely different access pattern from anything tried in Phases 6B–9.
I identified the exact real parameters for a candidate dataset
(`QubitPi/wiktionary-data`, Apache 2.0 wrapper over the same Wiktextract/
Wiktionary content, config `Wiktionary`, split `German`,
`german-wiktextract-data.jsonl`, ~186 MB) by reading its actual README via
search. **This is blocked too**, but for a different, more specific
reason than "too big": the `web_fetch` tool here refuses to fetch any URL
that has not already appeared verbatim in a prior search/fetch result, and
no indexed page anywhere links that exact API query string. So this
specific route is closed by a tool restriction, not by the dataset's
size or license. Documented in `SOURCE_LICENSE.md` with the exact
parameters, so a session with normal network access (or a `web_fetch`
without that restriction) can use it directly — no adapter work needed,
since `WiktextractJsonlAdapter` (built in Phase 6B) already parses this
exact JSONL schema.

**No other avenue existed to try that hadn't already been exhausted** in
Phases 6B/7/8 (direct LFS resolve, GitHub raw, per-word page scraping,
range-bucket page crawling — all previously confirmed blocked or
impractically slow).

## 2. The article-duplication problem (spec §3–9, §28) — audited, found already correct, now proven with tests

I audited the actual 5,797-record merged pool (not assumed the schema was
fine because Phase 6 designed it that way):

- **0** master-lexicon entries have an article embedded in their `lemma`
  field (e.g. no `"der Tisch"` stored where `lemma` should be `"Tisch"`).
- **0** curated entries have this either (the 1 false-positive hit —
  the phrase *"Das kommt darauf an."* — is a real German sentence
  starting with the ordinary word "Das", not a noun-article bug; already
  correctly handled since Phase 9's `bucketLetter` fix).
- `Tisch`, `Haus`, `Frau` (and every other noun) each exist as **exactly
  one** record, with `article` as metadata on that one record — never as
  a second, separate `"der Tisch"`-style entry.
- The standalone article words (`der`, `die`, `das` as their own
  function-word/article lexemes, e.g. for teaching "what is an article")
  correctly co-exist as **separate, legitimate** entries from any noun —
  exactly the distinction spec §9 asks for.

**New, permanent regression test added:** `tests/test_phase10.js`
includes a **general invariant** (not just the three named examples) that
scans the entire merged pool for any record whose lemma equals
`<some other noun's article> + ' ' + <that noun's own lemma>` — this
would catch the bug for *any* noun, not only Tisch/Haus/Frau, and for any
future data added by a later phase.

## 3. Repeatability (spec §21, §31)

Two new tests prove this rather than assume it:
- Running the sourced-data pipeline (`runImportMulti`) twice on the same
  input files produces byte-identical record IDs and an unchanged
  curated count — no duplicate growth.
- `mergedPool()` is idempotent: feeding its own output back in as if it
  were "curated" data and merging again does not double the pool.

## 4. Exact counts (spec §26/§32 — measured, not estimated)

**Lemmas by word class** (merged pool, 5,797 records):
noun 2,823 · verb 1,049 · adjective 660 · adverb 361 · phrase 352 ·
proper noun 162 · idiom 82 · preposition 60 · number 60 · pronoun 39 ·
conjunction 28 · subjunction 21 · interjection 54 · particle 17 ·
determiner 16 · article 8 · modal particle 5 · abbreviation 0 · other 0

**CEFR:** A0 63 · A1 1,126 · A2 1,212 · B1 1,512 · B2 1,146 · C1 650 ·
C2 85 · **Unknown 3** (only the genuinely-unclassified real sourced
records; the 5,101 authored records all carry an explicit
`cefrBasis: "authored-estimate"`, not "unknown" and not an official
classification — unchanged from Phase 8/9).

**Forms:** 13,408 surface/inflected forms, reported as a number entirely
separate from the 5,105 lemma count (never added together).

**Preservation:** 705/705 curated entries present and unmodified.
**Duplicates removed:** 0 found this phase (the dataset was already clean
going in — Phase 6-8's own build-time deduplication had already done
this work; Phase 10 is what verified it with a general-purpose test
rather than case-by-case).
**Redirects:** not applicable — no source data with redirect records has
been imported.
**Malformed records:** 0 (re-verified by re-running Phase 8's
`build-authored.js` validator, which still reports 0 invalid lines and 0
duplicate IDs across all 18 `.psv` source files).

## 5. What changed in the repository this phase
- `tests/test_phase10.js` — **new**, 11 tests (all passing).
- `SOURCE_LICENSE.md`, `DATA_SOURCES.md` — new source research
  (`QubitPi/wiktionary-data`) documented, including exactly why and how
  it's still blocked.
- **No changes to `app.js`, `db.js`, or any UI/lesson/exercise code** —
  per the phase boundary (§29), nothing outside data/validation was
  touched.
- **No new vocabulary was authored.** Per §2's explicit instruction, this
  phase did not add another hand-written batch.

## 6. Tests
**213 passed, 0 failed** total (127 original + 41 Phase 6/6B + 34 Phase 9
+ 11 new Phase 10). No regressions.

## 7. Phase boundary (spec §34)
Per the phase's own stated closing instruction, stopping here:
1. Broad-source acquisition: attempted again, honestly still blocked (new
   evidence, new avenue tried and ruled out) — **not** a complete
   acquisition pipeline claim, because the adapter already existed from
   Phase 6B; what's missing is purely the download, not code.
2–8. Normalization/classification/article-metadata/lemma-form separation/
   category coverage/curated preservation/repeatable generation: already
   true from Phases 6–9, **now verified by tests** rather than assumed.
9. Validation: passes (213/213).
10. Exact counts: reported above.

**Not started, per the explicit phase boundary:** lessons, exercises,
grammar, listening, speaking, AI, teacher features, pronunciation,
camera, or any UI redesign.

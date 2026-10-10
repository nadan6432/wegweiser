# WEGWEISER PHASE 11 — ACTUAL GERMAN MASTER VOCABULARY ACQUISITION

## RESULT: VERIFIED BLOCK (not SUCCESS)

Per this phase's own §24: tests passing is not the success criterion.
The success criterion is whether a genuinely large legitimate German
lexical dataset was acquired and integrated. **It was not.** The master
lexicon is unchanged: still 5,105 lemmas. No bulk data was added. No
manual word batch was added either, per this phase's explicit
prohibition on that shortcut.

What this phase actually did: tried five specific mechanisms not
attempted in any prior phase, found a materially more precise diagnosis
of *why* acquisition fails in this environment, and confirmed the
existing importer needs zero changes once real data is reachable.

## SOURCE (identified, not acquired)
- **Source name:** kaikki.org machine-readable German dictionary
  (Wiktextract extraction of German-language Wiktionary content)
- **Version:** structured data extracted 2026-09-28, from the enwiktionary
  dump dated 2026-09-02 (confirmed live from the source's own page footer
  this phase — more current than the "no pinned version" noted in Phase
  6B/7).
- **License:** CC BY-SA + GFDL (Wiktionary's standard dual license);
  confirmed and documented since Phase 6B.
- **Source size:** ~1.0 GB combined; individual part-of-speech splits
  range from ~263 kB (conjunctions) up to ~298 MB (verbs).
- **Acquisition method attempted:** direct file fetch (blocked by
  response-size cap for the big files, and — newly discovered this phase —
  by `.jsonl` content-type/binary detection even for the tiny files),
  Hugging Face `datasets-server` paginated rows API for a re-packaged
  copy of the same content (blocked by this tool's URL-must-be-pre-seen
  restriction), npm/pip package registries (blocked, same egress proxy),
  Kiwix/ZIM Wiktionary mirrors (real, but same per-word-fetch scaling
  problem), and a text-extraction proxy workaround for the `.jsonl`
  binary-detection issue (blocked by the same URL-pre-seen restriction).

## ACQUISITION LOG (this phase, in order tried)

| # | Mechanism | Result |
|---|---|---|
| 1 | `curl` to `datasets-server.huggingface.co`, `huggingface.co`, `kaikki.org`, `raw.githubusercontent.com`, `github.com`, `api.github.com`, `dumps.wikimedia.org` (bash) | `403 host_not_allowed` — unchanged from Phase 10 |
| 2 | `npm view` / `npm install` against `registry.npmjs.org` | `403 Forbidden` — **new**, rules out the "install a package with bundled data" route |
| 3 | `pip download` against PyPI | No index reachable — **new**, same conclusion for Python packages |
| 4 | `web_fetch` on `kaikki.org`'s tiny per-POS bulk files (conjunctions, 263 kB) | Returned `[binary data]` — refused by content-type, not size. **New, more precise finding** |
| 5 | Hugging Face `datasets-server` rows API with exact real `config`/`split` parameters (`QubitPi/wiktionary-data`, `Wiktionary`/`German`) | Blocked: URL never appeared verbatim in a prior result |
| 6 | Kiwix/ZIM Wiktionary mirror pages (`kiwix.lema.org`, `*.freedombox.rocks`) | Real and fetchable per word, but the same per-word-call scaling limit as kaikki.org's own per-word pages (Phase 6B) |
| 7 | `r.jina.ai/<url>` text-proxy workaround for finding #4's binary-detection issue | Blocked: constructed URL never appeared verbatim in a prior result, even though the pattern itself is documented and legitimate |

## BEFORE / AFTER
```
Existing master lemmas (before):  5,105
Existing curated entries (before):  705
Master lemmas (after):            5,105   <- UNCHANGED
Inflected forms (after):         13,408   <- UNCHANGED
Total searchable records (after): 5,797   <- UNCHANGED
```
No word-class, CEFR, or noun-data counts changed — see `PHASE10_REPORT.md`
for the full breakdown, which still applies unchanged.

## QUALITY / TESTING
No new data was imported, so no new data-quality checks were run against
new records. The **existing** validation, article-duplication invariant,
and repeatability tests were re-run to confirm the baseline is still
solid before reporting the block:
- Full regression: **213 passed, 0 failed** (unchanged from Phase 10 —
  127 original + 41 Phase 6/6B + 34 Phase 9 + 11 Phase 10).
- Browser test: not re-run this phase (no app/UI code changed, per this
  phase's explicit "no UI work" boundary — re-running it would have
  tested nothing new).

## WHAT A NETWORKED ENVIRONMENT SHOULD DO
The importer and adapters need **zero code changes**. Two ready paths,
in order of preference:

```bash
# Path A — smallest real win first, per-category, avoids the 1 GB file:
# (requires a fetcher that doesn't binary-detect .jsonl, e.g. curl/wget,
#  not this sandbox's web_fetch tool)
curl -L -o /tmp/conj.jsonl \
  https://kaikki.org/dictionary/German/pos-conj/kaikki.org-dictionary-German-by-pos-conj.jsonl
node tools/lexicon/run.js --source=wiktextract-jsonl --input=/tmp/conj.jsonl

# Path B — the full dataset, streaming (already built for this in Phase 7):
node tools/lexicon/download.js  # ~1 GB from kaikki.org
node --max-old-space-size=8192 tools/lexicon/stream-run.js \
  --source=wiktextract-jsonl \
  --input=data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl
```

## ANSWER TO THE REQUIRED QUESTION (spec §24/§33)
> Did we actually acquire and integrate a genuinely large legitimate
> German lexical dataset?

**No.** Five new legitimate mechanisms were tried this phase; all five
are blocked by properties of this specific sandboxed environment (a
closed egress allow-list for `bash`, and `web_fetch`'s binary-content-type
detection plus its URL-must-be-pre-seen restriction) — not by the
source's size, license, or availability, and not by any remaining
uncertainty about how to do the import once the file is reachable. The
importer, adapters, streaming pipeline, and validation are all real,
tested, and ready (Phases 6B/7/9/10). The one missing ingredient is
network access this environment does not have.

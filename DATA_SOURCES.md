# Data Sources Index

See `SOURCE_LICENSE.md` for full license terms. This file is the short
index; that file is the authority.

| Source | Status | License | Covers | Adapter |
|---|---|---|---|---|
| german-nouns (gambolputty) | Selected, license verified. Full file NOT downloaded here (see `data/raw/german-nouns-wiktionary/NOTE.md`) | CC BY-SA 4.0 | Nouns: gender, plural, full case declension | `tools/lexicon/sourceAdapters.js` → `GermanNounsCsvAdapter` |
| kaikki.org Wiktextract (German) | **ACQUIRED AND IMPORTED, Phase 12.** User uploaded the real ~1.08 GB dataset (4 files, 371,261 lines) directly; processed in full. 92,880 total master lemmas (87,775 newly imported + 5,105 prior). See `PHASE12_REPORT.md` | CC BY-SA + GFDL | All POS: glosses, forms, IPA, examples, 1,502,402 surface forms | `WiktextractJsonlAdapter` (`wiktextract-jsonl`) + `tools/lexicon/mojibake.js` (encoding repair) |
| cstr/de-wiktionary-sqlite (HF) | Researched, NOT selected/implemented yet | CC BY-SA 4.0 | ~970k entries, full normalized schema | none yet — candidate "Source C" |
| QubitPi/wiktionary-data (HF) | Researched Phase 10, config/split confirmed (`Wiktionary`/`German`), NOT acquired — same 186 MB size wall; paginated `datasets-server` API route identified but blocked by this environment's URL-must-be-pre-seen restriction | Apache 2.0 (wrapper) + underlying CC BY-SA/GFDL (Wiktionary) | Same Wiktextract content as kaikki.org, repackaged | none yet — `WiktextractJsonlAdapter` should also parse this directly (same underlying schema) |

Adding a new row here + a new adapter in `tools/lexicon/sourceAdapters.js`
is the entire cost of a new source (spec §7) — `tools/lexicon/pipeline.js`
never hard-codes which one is active; it's selected by `--source=` on the
CLI (`tools/lexicon/run.js`).

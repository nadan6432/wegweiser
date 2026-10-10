# Phase 12 real source files

The four files processed this phase (`kaikki_part_1.jsonl` ... `kaikki_part_4.jsonl`,
uploaded by the user, ~1.08 GB / 371,261 lines total) are the real German
Wiktextract/Wiktionary dataset this whole project has been trying to
acquire since Phase 6B.

**These raw files are NOT stored in this repository/zip** — they already
exist on the user's machine (they uploaded them), and shipping ~1 GB of
raw JSONL back inside the deliverable zip would be wasteful duplication
with no benefit, consistent with this project's standing rule to keep
large raw source data out of version control (see the equivalent note in
`data/raw/kaikki-wiktextract/NOTE.md` from Phase 6B).

What IS in this repository: the **processed, deduplicated, merged output**
at `data/processed/master/`, built by actually running these 4 files
through `tools/lexicon/streaming.js`'s `runImportStreaming()` — see
`PHASE12_REPORT.md` for the full run log and exact counts.

## Source identity
- Same source as documented in `SOURCE_LICENSE.md`: kaikki.org's
  Wiktextract extraction of German-language Wiktionary content
  (CC BY-SA + GFDL).
- File format: JSONL, UTF-8 with a leading BOM per file, CRLF line
  endings, pre-filtered to `lang_code: "de"` only (verified: 100% of a
  multi-thousand-record sample across all 4 files was `lang_code: "de"`).
- **Known data-quality issue found and fixed during processing:** roughly
  15–24% of records in every one of the 4 files have their non-ASCII
  characters (ä/ö/ü/ß and others) corrupted by a double cp1252/UTF-8
  encoding pass somewhere in these files' own prior preparation pipeline
  (e.g. the literal string `"Ã„pfelchen"` where `"Äpfelchen"` was meant).
  This is NOT a corruption introduced by Wegweiser's importer — it was
  present in the uploaded files as given. Repaired deterministically by
  `tools/lexicon/mojibake.js` (reverse the cp1252 mis-decode, then decode
  as UTF-8), validated against 2,000+ real affected words across all 4
  files with zero mis-corrections. See `PHASE12_REPORT.md` for the
  validation log.
- Exact dataset version/dump date was not separately re-confirmed for
  these specific uploaded files (no accompanying manifest/checksum was
  provided with the upload); kaikki.org's own live site reported a
  2026-09-02 Wiktionary dump / 2026-09-28 extraction as of Phase 11's
  research, which is consistent with but not proven identical to this
  upload.

## To regenerate the processed output from these files again
```bash
node tools/lexicon/run-phase12.js \
  --inputs=/path/to/kaikki_part_1.jsonl,/path/to/kaikki_part_2.jsonl,/path/to/kaikki_part_3.jsonl,/path/to/kaikki_part_4.jsonl
```

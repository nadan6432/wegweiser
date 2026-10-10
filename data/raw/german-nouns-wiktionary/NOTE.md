# What's actually here

This directory is where the real `nouns.csv` (≈19.3 MB, ~90–100k rows)
from https://github.com/gambolputty/german-nouns belongs. It is **not**
present in this build.

## Why

This pipeline was built in a sandboxed environment with no outbound network
access for bulk file transfer (no direct download, and GitHub's raw-file
host disallows the automated fetcher available here). The dataset's own
web page confirms the file is too large to preview directly on GitHub.

## What IS here

`sample.csv` — 2 rows, reproduced verbatim from the project's own README
(the `Fahrrad` and `Stein` lookup examples), in the same CSV shape the
adapter expects. This is enough to exercise `GermanNounsCsvAdapter` and the
rest of the pipeline end-to-end, but it is a documentation excerpt, not a
sample drawn from the actual file, and must not be reported as "N words
imported from the master lexicon" anywhere in the app or in a phase report.

## To run this at real scale

1. Download `german_nouns/nouns.csv` from
   https://github.com/gambolputty/german-nouns/raw/refs/heads/main/german_nouns/nouns.csv
   on a machine with normal network access.
2. Place it at `data/raw/german-nouns-wiktionary/nouns.csv`.
3. Run:
   ```
   node tools/lexicon/run.js --source=german-nouns-csv \
     --input=data/raw/german-nouns-wiktionary/nouns.csv \
     --out=data/processed/master-lexicon.json
   ```
4. Re-run the Phase 6 test suite (`node tests/test_phase6.js`) — the
   structural tests pass against any correctly-shaped input, real or
   sample, but the scale/coverage numbers in the final report are only
   meaningful once step 1–3 used the real file.

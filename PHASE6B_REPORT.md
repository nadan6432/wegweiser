# WEGWEISER PHASE 6B
# FULL GERMAN MASTER LEXICON

## STATUS: FULL IMPORT NOT EXECUTED — environment could not acquire the bulk data

This report does not claim a completed master dictionary. The master
lexicon in this build holds **4 real lemmas**. Pipeline and adapters are
ready; the bulk run needs a machine with network access (commands below).

## Network test (done first, as instructed)
- bash: `curl` to raw.githubusercontent.com, github.com, huggingface.co,
  kaikki.org, dumps.wikimedia.org, pypi.org, cdn.jsdelivr.net,
  codeload.github.com → all `403 x-deny-reason: host_not_allowed`.
- web_fetch: works for small pages; full German JSONL (~1 GB) and the
  verb-only split (~298 MB) fail with 413 (>48 MB response cap);
  raw GitHub hosts fail with ROBOTS_DISALLOWED.

## Source
- Primary broad source: kaikki.org Wiktextract German (Tatu Ylonen),
  https://kaikki.org/dictionary/German/index.html
- Secondary: german-nouns (gambolputty), nouns only
## License
CC BY-SA (+ GFDL) for Wiktionary-derived data; details and attribution
text in `SOURCE_LICENSE.md`. Attribution not yet surfaced in app UI
(no About screen wiring done).
## Dataset version / download date
No pinned version. 2 kaikki entries + 2 README nouns fetched 2026-09-27.

## Raw / German / Accepted / Rejected
Raw records 4 (2 per source) · German 4 · Accepted 4 · Rejected 0 ·
Warnings 0 · Duplicates 0

## Master lexicon size
- Lemmas: 4 (Fahrrad, Stein, Wiki, gehen)
- Inflected forms: 16 counted by the service (case tables of the two CSV
  nouns only; Wiki's and gehen's forms are stored but not yet counted — a
  known reporting gap)
- Senses: 4 (Wiki 1, gehen 3)
- POS: noun 3, verb 1; all other classes 0
- CEFR: A0–C2 0; UNKNOWN 4
- Layers: core/curated 705 (unchanged) · dictionary-only 3 · enriched 1

## Existing Wegweiser merge
Before 705 · after 705 · removed 0 · enriched 1 (`gehen`, only a
provenance marker; its curated forms, examples, translations untouched
because curated data wins) · merged 1.
Urdu/Pashto/SRS/favorites: untouched (pipeline never writes them).

## Translations
English glosses: 2/4 (kaikki entries). Urdu/Pashto: 0 imported (curated
ones preserved).

## Search
Form→lemma lookup (`Fahrrädern`→`Fahrrad`), exact lemma, A–Z, word-type
and CEFR (incl. unknown) filters pass in unit tests over the 4 records.
**Not wired into the app's Dictionary UI**; no browser testing done.
Adjective/adverb/pronoun/preposition/conjunction/particle/phrase/idiom
coverage: none imported, so ging→gehen style lookups for those classes are
unverified against real data.

## Performance
Only micro-measured: 10,000 form lookups over 4 records = 8 ms. Not
meaningful at scale. Startup, memory, and dictionary latency at real size
are unmeasured.

## Tests
Existing 127 passed / 0 failed · New 36 passed / 0 failed ·
Total 163 / 0. Browser: not run. Console errors: not measured.

## Validation
Duplicate IDs 0 · broken references 0 · validation errors 0 ·
non-German records 0 (at this size).

## Run the real import (on a networked machine)
    # download (~1 GB)
    curl -L -o data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl \
      https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl
    # nouns (optional second source)
    #   https://github.com/gambolputty/german-nouns  -> german_nouns/nouns.csv
    node tools/lexicon/run.js --source=wiktextract-jsonl \
      --input=data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl
Do not commit the raw file; keep it out of git.

## Remaining limitations (honest)
1. **No real-scale data.** Everything above is 4 records.
2. **Streaming**: adapters use `readFileSync` + split; a 1 GB JSONL will
   exceed memory. Needs a line-streaming reader before the real run.
3. **Progress output, per-stage timing, diffing, versioning fields**
   (spec §45, §47, §53–54) not implemented.
4. **Static/offline delivery** (chunked JSON/IndexedDB, lazy loading,
   prebuilt indexes, spec §42–44) not designed or implemented; the
   service loads one JSON file via Node `fs`, not a browser.
5. **Dictionary UI, browser tests, About/Credits attribution** not done.
6. Classification gaps: proper nouns, prefix/suffix, proverbs map to
   `unknown` (no matching Schema category); subjunction, modal particle,
   idiom not distinguished. Forms of adjectives/adverbs unhandled.
7. Kaikki `forms` for nouns are a flat tag map, verbs a truncated list of
   ≤12 entries; adjective comparison forms not extracted.
8. Curated-key matching uses lemma+wordType; homonym senses from a bulk
   source are merged by that key (senses kept, not split).

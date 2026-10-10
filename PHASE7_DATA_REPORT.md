# WEGWEISER PHASE 7 — DATA REPORT

## OUTCOME: C — MASTER DATASET NOT IMPORTED

Only the **4 real sample lemmas** from Phase 6/6B exist (Fahrrad, Stein,
Wiki, gehen). No bulk dataset was acquired. No data was generated to fill
the gap. This is not a full German dictionary.

## Acquisition attempts (all tested this phase)
1. Existing files in project/caches/system: none (only the 2+2-row samples;
   no German hunspell/wordlists/nltk/spaCy data installed either).
2. bash network: kaikki.org, huggingface.co, github.com, raw.githubusercontent.com,
   pypi.org, files.pythonhosted.org, registry.npmjs.org, dumps.wikimedia.org,
   cdn.jsdelivr.net → all `403 host_not_allowed` (egress allow-list). So
   HF, GitHub releases, PyPI and npm mirrors are all closed too.
3. web_fetch: full German JSONL (~1 GB) and verb split (~298 MB) → 413
   (>48 MB cap); raw GitHub → robots-blocked; only small per-word pages work.
4. Blocker: this environment cannot obtain the bulk file. You must run the
   commands below on a network-enabled machine (or drop the file in place).

## Real numbers (current repository)
| | |
|---|---|
| Source records processed | 4 (2 CSV rows, 2 JSONL lines) |
| German lemmas | 4 |
| Inflected forms (surface) | stored for the samples only; not meaningful |
| Nouns / Verbs | 3 / 1 |
| Adjectives, adverbs, pronouns, articles, determiners, prepositions, conjunctions, subjunctions, particles, interjections, numerals, abbreviations, phrases, idioms, proper nouns | 0 |
| CEFR A0–C2 / UNKNOWN | 0 / 4 |
| Rejected / warnings / duplicates | 0 / 0 / 0 |
| Translations: English glosses (source) / Urdu / Pashto imported | 2 / 0 / 0 |
| Existing curated entries before / after | 705 / 705 (0 removed, 1 enriched: `gehen`, provenance marker only) |
| Tests | 168 passed, 0 failed (127 original + 41 pipeline) |

## What was built this phase (only what the real run needs)
- `WiktextractJsonlAdapter.parseLine`: line-based parsing; German-only
  filter; **form-of/alt-of entries are captured as forms of their lemma, not
  lemmas**; `sourcePos` kept; flat `surfaceForms` collected for search.
- `tools/lexicon/streaming.js`: constant-memory raw read (readline),
  progress every 50k lines, per-stage timing, dedupe (homograph senses are
  appended, not dropped), curated merge (curated wins), lemma/form counts
  reported separately, quality stats.
- `exportChunked`: static chunks `master/lemmas/<letter>.json`,
  `master/forms/<letter>.json` (surface form → lemma ids) + `manifest.json`,
  instead of one giant file; offline-friendly lazy loading.
- `tools/lexicon/download.js`, `tools/lexicon/stream-run.js`.
- Master records now carry `sourcePos`, `sources[]`, `layer: MASTER_DICTIONARY`,
  `curated: false`, `cefr: unknown`. 5 new tests (inline shape fixtures,
  never written to data/).

## Run the real import
    node tools/lexicon/download.js          # ~1 GB from kaikki.org
    node --max-old-space-size=8192 tools/lexicon/stream-run.js \
      --source=wiktextract-jsonl \
      --input=data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl \
      --version=<dump date>
Output: `data/processed/master/` (chunks) and
`data/exports/phase7-audit-report.json` (all counts the spec asks for).
Keep the raw file out of git. If the download URL is dead, use the current
one from https://kaikki.org/dictionary/rawdata.html and pass it to download.js.

## Known risks (unverified because the bulk file could not be read)
- The `form_of`/`alt_of` field names and the `pos` value set are from
  Wiktextract's documented output; run the first 1,000 lines and inspect
  `forms.orphanFormsWithNoLemma` and `raw.formOfEntries` before trusting counts.
- Dedupe holds all lemma records in memory (100k+ records with senses is
  likely a few GB heap; hence the heap flag).
- Not done: adjective comparison / verb-conjugation extraction beyond the
  first 12 forms, subjunction/modal-particle/idiom classification, proper
  noun filtering policy, the app-side lazy loader over the chunks, Dictionary
  UI wiring, About/Credits attribution, browser tests, performance numbers.
- The processed sample master file is still the Phase 6B 4-lemma file.

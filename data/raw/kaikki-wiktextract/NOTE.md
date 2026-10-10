# What's actually here

This directory is where the real kaikki.org German Wiktextract data
belongs. What's actually present is `sample.jsonl` — 2 real entries
(`Wiki`, `gehen`), fetched one page at a time from kaikki.org's own
published per-word pages on 2026-09-27. That is NOT a sample drawn from
the bulk file — it's the entire set this environment could retrieve.

## Why the bulk file isn't here

Two independent blockers, both tested this phase:

1. **bash has no outbound network access.** The sandbox's egress proxy
   allow-lists specific hosts, and none of the candidates (`kaikki.org`,
   `github.com`, `huggingface.co`, `dumps.wikimedia.org`, ...) are on it —
   confirmed with `curl` (see `SOURCE_LICENSE.md` for the exact output,
   `x-deny-reason: host_not_allowed`).
2. **`web_fetch` (a separate tool) can reach kaikki.org**, but:
   - The full German dictionary JSONL is ~1.0 GB — fetching it returns
     `413: Serialized response too large, exceeded RESPONSE_SERIALIZED_MAX_BYTES (50331648 bytes)`
     before any truncation happens.
   - The per-part-of-speech split (e.g. verbs-only, ~298 MB) hits the same
     413 error.
   - `raw.githubusercontent.com` and similar raw-file hosts return
     `ROBOTS_DISALLOWED` for this tool.
   - Individual per-word `.html` pages (a few KB each, e.g.
     `kaikki.org/dictionary/German/meaning/g/ge/gehen.html`) DO work — that's
     how `sample.jsonl`'s two entries were obtained, one `web_fetch` call
     per word, drilling through kaikki.org's own POS → range → word index
     pages to find each one.

Fetching a real multi-thousand-word sample this way is theoretically
possible but impractically slow (2+ tool calls per word, no bulk listing
of "all German verbs" as flat links — only nested alphabetical range
pages). It was not attempted at scale in this session.

## To run this at real scale

1. On a machine with normal network access, download either:
   - The full dictionary: `https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl` (~1.0 GB, marked deprecated by kaikki.org but still live), or
   - The recommended non-deprecated raw data: see `https://kaikki.org/dictionary/rawdata.html` for the current raw wiktextract JSONL and how to filter it to German (`lang_code == "de"`) — this adapter already does that filtering (`sourceAdapters.js`, `WiktextractJsonlAdapter.parse`).
2. Place the file at `data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl` (or any path).
3. Run:
   ```
   node tools/lexicon/run.js --source=wiktextract-jsonl \
     --input=data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl
   ```
   Or combine with the noun source in one pass:
   ```
   node tools/lexicon/run.js \
     --source=german-nouns-csv,wiktextract-jsonl \
     --input=data/raw/german-nouns-wiktionary/nouns.csv,data/raw/kaikki-wiktextract/kaikki.org-dictionary-German.jsonl
   ```
4. Re-run `node tests/test_phase6.js` — the structural tests pass against
   any correctly-shaped input; the scale/coverage numbers in
   `PHASE6B_REPORT.md` are only meaningful once step 1–3 used the real file.

Given the full file's size (~1 GB), a streaming JSONL parser (line-by-line,
not `fs.readFileSync` as the current adapter uses) will likely be needed
for memory safety — see `PHASE6B_REPORT.md`, "Remaining limitations".

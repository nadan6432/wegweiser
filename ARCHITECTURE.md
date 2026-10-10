# Wegweiser — Architecture Notes (Phase 2.5 → Learning Engine)

This document describes the data/curriculum/engine layer added on top of
the existing static app. It is intentionally short — the code itself
(`src/`) is the primary documentation, with comments at the top of every
file explaining *why*, not just *what*.

## Why this shape

The existing app is a no-build, browser-globals static site: `data.js`,
`content2.js`, `logic.js`, `db.js`, `srs.js`, `providers.js` and `app.js`
loaded via plain `<script>` tags, in that order. Rather than introducing a
bundler or rewriting the UI, this phase adds a new layer of globals under
`src/`, loaded *after* the legacy files and *before* `app.js`, that:

1. Authors a much larger, hand-written curriculum (A0 foundation through
   C2) using a compact DSL instead of hand-writing every JS object.
2. Merges that curriculum into the **same global names** app.js already
   reads (`VOCAB`, `LESSONS`, `GRAMMAR`, `PLACEMENT_TEST`,
   `READING_TEXTS`, `LISTENING_ITEMS`, `WRITING_PROMPTS`,
   `CONVERSATION_SCENARIOS`, `EXAM_FRAMEWORKS`), so the existing UI
   renders the expanded content with only two small, targeted patches to
   `app.js` (see "Two app.js patches" below) — no rewrite.
3. Adds a genuine repository + service layer (mastery, weakness,
   personalization, assessment, teacher-context, search) that operates on
   the merged content and the existing `db.js`, ready for `app.js` to call
   into incrementally.

## Load order (`index.html`)

```
data.js, content2.js, logic.js, db.js, srs.js, providers.js   ← legacy, unchanged in content
src/core/schema.js, src/core/dsl.js                            ← authoring primitives
src/content/levels.js, grammar.js, vocabulary.core.js,
  vocabulary.upper.js, lessons.a0a1.js, lessons.a2.js,
  lessons.b1.js, lessons.b2c1c2.js, reading.js, writing.js,
  listening.js, speaking.js, conversation.js, assessments.js,
  mistakes.js, manifest.js                                     ← new content packs
src/content/registry.js                                        ← merges everything
src/repositories/repositories.js                                ← DB-backed accessors
src/services/learning.js, assessment.js, teacher.js, query.js  ← engine services
<script>Registry.apply()</script>                               ← runs the merge
app.js                                                          ← unchanged UI, now sees expanded content
```

`Registry.apply()` must run after every content file and before `app.js`.

## The one non-obvious technical detail: why `Registry` mutates arrays

`data.js`/`content2.js` declare their globals with `const` (e.g.
`const VOCAB = [...]`). A top-level `const` in a classic `<script>`
creates a binding in the page's **Global Declarative Environment**, which
is a different thing from a property of `window`. Two consequences that
shaped `registry.js`:

- `window.VOCAB` is `undefined` even after `data.js` has run — so reading
  legacy content must use the bare identifier `VOCAB`, not
  `window.VOCAB`.
- `window.VOCAB = newArray` would **not** change what a later `<script>`
  sees when it references the bare identifier `VOCAB` (declarative
  bindings are resolved before object-environment properties of the same
  name) — so publishing merged content must **mutate the same array in
  place** (`arr.length = 0; arr.push(...values)`), not reassign the
  binding.

`src/content/registry.js` does exactly this, and documents it in its file
header. Anything genuinely new (with no legacy counterpart to mutate) is
exposed once, under a single `window.WEGWEISER = {...}` namespace, to
avoid adding more ad-hoc globals.

## Two `app.js` patches

Beyond `index.html`'s new `<script>` tags, exactly two small changes were
made to `app.js` itself, both backward-compatible:

1. **Branching conversations.** The legacy conversation runner advanced
   `stepIndex` by exactly one on every choice. The richer, branching
   dialogue trees authored in `src/content/conversation.js` are flattened
   by the registry into the same flat `steps` array shape, but each
   option can carry a `nextIndex`. `app.js`'s `conversation-choose`
   handler now uses `nextIndex` when present, falling back to "advance by
   one" when it isn't — so old, linear scenarios behave identically.
2. **Conversation history rendering.** Because branching can skip step
   indices, the on-screen dialogue history now stores the NPC line
   alongside each choice at the moment it was made (`ch._npc`), instead of
   re-deriving it from `c.steps[i]` (which assumed a strictly linear
   1-2-3 walk).

No other UI code was changed. There is deliberately no per-level or
per-lesson hardcoding anywhere in `app.js` — it was already a generic
renderer, and the new content had to fit that renderer's existing
contracts, not the other way around.

## Content authoring: `src/core/dsl.js`

Vocabulary, grammar and lesson content is authored in compact, hand-
checked line formats (see the file header for the exact grammar), then
expanded into full `Schema`-shaped records. This is what makes ~500
hand-written vocabulary items and ~60 lessons maintainable by a person
instead of requiring a code generator: a new word is one line, a new
exercise is one line, and `DSL.buildLevel()` derives ids, ordering and
prerequisite chaining automatically.

## Content validation

`src/core/validate.js` runs structural checks against the **merged**
graph (duplicate ids, broken vocab/grammar/lesson/unit references, mcq
answers that aren't in their own options list, build/order exercises
that would visually reveal their own answer, prerequisite edges that
point to a later CEFR level than the item itself). `tests/test_content_
integrity.js` runs it as part of the test suite; `tests/test_engine.js`
exercises the registry merge and the service layer end to end.

## What is genuinely wired up vs. available-but-not-yet-connected

**Connected into the running UI today:**
- All A0–C2 vocabulary, grammar, and lessons (via the merged `VOCAB`,
  `GRAMMAR`, `LESSONS` globals) — the Learn/Lesson/Vocab/Grammar screens
  render this content exactly as they rendered the original 11 lessons.
- The expanded placement test (appended to the original 10 questions).
- The mcq-shaped subset of the new reading/listening comprehension
  questions, and the new writing prompts and branching conversation
  scenarios (the branching now actually branches, via the `app.js`
  patch described above).
- `db.js` v2's new stores (`skillProgress`, `unitProgress`,
  `assessmentResults`, `learnerContext`) exist and are additive; no
  existing store or its data is touched by the upgrade.

**Built, tested, and callable — but not yet wired to a UI button:**
- `src/services/learning.js` (`getNextLesson`, `getLevelProgress`,
  `getWeakAreas`, `getRecommendedPractice`, `buildDailyPlan`,
  `getSkillProgress`, …)
- `src/services/assessment.js` (unit/level/skill assessment building and
  grading, sampled from the real exercise pool per
  `ASSESSMENT_TEMPLATES`)
- `src/services/teacher.js` (builds a local-only "teacher context"
  reference object; there is still no AI/network call behind it — that
  remains an honestly-unavailable provider, exactly as `providers.js`
  already discloses for the rest of the app)
- `src/services/query.js` (cross-content search)
- Fill-in/short-answer comprehension questions on the new reading/
  listening content (the legacy inline-quiz renderer only supports
  multiple-choice; those questions exist in the data but are filtered out
  of the legacy-compatible view rather than crashing the UI)
- Original exam-style tasks (`ASSESSMENTS.EXAM_TASKS`) modelled on the
  publicly known Goethe/telc/ÖSD structure — original content only, no
  claim of official affiliation or certification anywhere in the data or
  its `disclaimer` fields.

Nothing in this phase fakes AI responses, speech recognition,
pronunciation scoring, or cloud sync. Where such a capability doesn't
exist, the content or provider says so explicitly (see `disclosure`
fields on listening/speaking content, and the existing `providers.js`
pattern of returning `{ok:false, source:'unavailable'}`).

## Phase 3.5 — connecting the engine to the actual UI

Phase 3.5 audited every screen in `app.js` against the Phase 2.5 engine
and connected what was still sitting unused. The most important finding:
**the exercise engine, answer evaluation, mistake recording, and SRS were
already real and DB-backed before this phase** — that part of the
original app was never fake. What was actually missing was navigation
and a few screens that hadn't caught up to the expanded content:

- **Level Hub.** `renderLearn` hard-coded `['A1','A2','B1','B2','C1','C2']`
  (no A0) and displayed *"Phase roadmap: A1–A2 now, B1–C2 planned next"*
  even though that content already existed on disk. Rewritten into a
  real Level → Unit → Lesson hub using `WEGWEISER.UNITS`/`LEVEL_META`,
  with progress bars computed from actual `lessonProgress`.
- **Recommendations.** `nextRecommendedLesson`/`allCurrentLessonsDone`
  only ever scanned A1/A2. Rewritten to scan all seven levels in CEFR
  order, honouring each lesson's real `prereq` chain.
- **Progress screen.** The per-level breakdown was hard-coded to A1/A2;
  now iterates every level that actually has lessons. A new "Focus area"
  panel surfaces the real weakest category (via `Logic.weakestGroup` on
  actual attempt data) with a working "Practice" button.
- **Vocabulary detail.** `dictWordRow` only showed the plain legacy
  fields. Now shows synonyms/opposites/collocations/common-mistakes and
  which lessons a word appears in (linking back with `open-lesson`),
  when the richer Phase 2.5 vocabulary data provides them.
- **Grammar detail.** Now shows prerequisite grammar topics, negative
  examples, exceptions, related vocabulary, and which lessons teach it —
  all cross-referenced by id from the merged content graph, not
  hand-picked. "Ask Teacher" and "Practice this grammar" both already
  worked against the full merged exercise pool and needed no change.
- **Teacher context.** `askTeacherLink` previously navigated to the
  Teacher tab with zero context — a bare label, nothing else. It now
  builds a real reference via `TeacherContextService.buildQuery()`
  (kind + id + a live learner-context snapshot) for vocabulary, grammar,
  speaking tasks, and — new — the wrong-answer feedback panel on every
  exercise. `providers.js`'s `TeacherService.ask()` was extended to
  accept and acknowledge that context while still being honest that no
  AI backend is connected.
- **Speaking Lab.** Was one hard-coded demo sentence with a record
  button, entirely disconnected from the 8 authored speaking tasks.
  Rewritten to list and run the real tasks (prompt, key phrases,
  self-check list, disclosed as self-assessed, no invented scoring).
- **Assessments.** New, real entry points: "Take unit assessment" on
  every unit card in the Level Hub, and "Full Skills Assessment" (by
  level or by skill) on the Placement & Level screen. All three call
  `AssessmentService.buildUnitAssessment`/`buildLevelAssessment`/
  `buildSkillAssessment`, run through the *same* exercise engine lessons
  already use (so answer evaluation is identical), and on completion
  save a real, DB-backed result via `Repositories.recordAssessmentResult`
  — distinct from Quick Placement, with an honest pass/fail threshold
  instead of an invented score.
- **Exam Prep.** Was pure decoration: generic routing to the labs plus a
  claim that "only A1–A2 practice content exists," while the 7 original
  exam-style tasks from `assessments.js` sat completely unused. Now lists
  and opens every real `EXAM_TASK` (matching tasks, transcript+question
  tasks, summary-choice tasks, writing/speaking prompts), each rendered
  by its actual shape rather than a generic template.
- Removed every remaining stale "not built yet" message that had been
  overtaken by the Phase 2.5 content (the placement-result screen still
  said deeper B1+ content was "planned next").

**What this phase deliberately did not change:** the exercise engine
itself, the mistake/attempt/SRS database logic, Reading/Listening/
Writing/Conversation screens (already reading the merged, expanded
arrays correctly with no code changes needed), and the overall visual
design — all per the phase's own instruction to connect data, not
redesign the shell.

**A known limitation of this phase's verification:** `app.js` reads
`document` at top-level load time (e.g. `const app = document.getElementById('app')`),
so it cannot be exercised in a plain Node process without a full DOM
implementation (jsdom), which this offline-first, no-build project does
not otherwise depend on and which isn't installed. Every change here was
verified by `node -c` syntax checking and careful manual tracing against
the existing, working patterns in the file, plus the full 71-test suite
covering the data/engine layer underneath it — but there is no automated
end-to-end browser test of the new screens themselves.

## Phase 4 — Vocabulary as a learning system, Dictionary as a universal lexicon

Phase 4 introduces a deliberate split that didn't exist before: **Vocabulary**
(words Wegweiser is actively teaching the learner) and **Dictionary** (every
German lexical entry Wegweiser knows about, searchable regardless of the
learner's CEFR level). They read the same underlying `VOCAB` records and
share the same favorites/learning-state — the split is about which screen
you're on and what question you're asking ("what should I learn next?" vs.
"what does this word mean?"), not two copies of the data.

### Vocabulary schema changes

`src/core/schema.js` gained a formal `WORD_TYPES` enum (noun, verb,
adjective, adverb, pronoun, article, preposition, conjunction, particle,
interjection, number, determiner, expression, phrase, abbreviation) plus
`WORD_TYPE_ALIASES` so pre-Phase-4 short forms (`adj`, `adv`, and the
original Phase 2.5 seed data's `prep`/`pron`/`num`/`qword`) keep validating
without being rewritten. `normalizeVocab` gained `topicTags` (a word can
carry more than one topic tag; `topic` stays the primary one so every
existing `.topic` equality check in the UI keeps working unchanged). No
existing vocabulary field was renamed or removed — this was an additive
schema change, so no `vocabProgress`/`profile.favorites` migration was
needed; those IndexedDB stores are untouched in shape.

### Vocabulary data

`src/content/vocabulary.expansion.js` is a new, separate content pack
(114 hand-written entries) rather than edits to the already-validated
494-word Phase 2.5 pack, so it can be reviewed or rolled back
independently. It fills a real gap the audit found: the existing pack was
noun/verb/adjective/adverb-heavy with **zero** standalone pronoun, number,
conjunction, preposition, or particle entries (they only existed buried
inside grammar explanations). It also populates `translations.ur`/`.ps`
(architecture that existed in the schema but nothing had ever filled) —
curated for the ~31 most basic, unambiguous everyday words (pronouns,
numbers 0–1000, a handful of core nouns/prepositions) where translation
confidence is genuinely high, and left absent everywhere else rather than
guessed, per the phase's own "if uncertain, omit the field" instruction.
Five accidental ID collisions with the existing pack were caught by the
content validator during development and fixed before merging (see
`tests/test_dictionary.js` and the extended checks in `src/core/validate.js`).

### Dictionary architecture (`src/services/dictionary.js`)

A new `DictionaryService`, separate from `QueryService` (which stays the
shallow cross-content search behind the global search box). It provides:

- **A-Z index** — words bucketed by their first letter (stripping a
  leading der/die/das for alphabetising, with ä/ö/ü bucketed under their
  base letter as German dictionaries conventionally do), memoized and
  invalidated only when the underlying `VOCAB` array actually changes.
- **Tiered, scored search** — exact German match → exact translation
  match → prefix match → partial match → inflected-form match → fuzzy
  (typo-tolerant) suggestion, returned as separate arrays so the UI can
  label each tier honestly instead of mixing exact and guessed results.
- **Typo tolerance** — a capped Levenshtein edit-distance implementation
  (early-exits once a candidate is already too far away), triggered only
  when nothing else matched, so it can't drown out real results.
- **Inflected-form lookup** — a real, hand-checked (not generated) map of
  ~90 high-frequency irregular surface forms (covering roughly 25 verb/
  noun/adjective lemmas — `ging`/`gingst`/`gegangen`→`gehen`,
  `Häuser`→`Haus`, `größer`→`groß`, etc.) to their lemma. This is explicitly the
  "architecture now, populate progressively" approach the phase asked
  for: every entry is linguistically verified and resolves to a lemma
  that actually exists in `VOCAB`, and the map is trivial to extend
  without touching any calling code.
- **Filters** (word type, CEFR level, gender) that apply identically to
  both search and A-Z browsing, and are always opt-in — the default is
  unrestricted, so an A0 learner searching "Wahrscheinlichkeit" gets the
  real C1 entry, not a hidden result.

### Dictionary/Vocabulary UI

- **Vocabulary** gained a real Dashboard (live counts — new/learning/
  mastered/weak/favorites — computed from actual `vocabProgress`, never
  invented), a filterable Browse view, and a **Learn new words** flow
  (word → meaning/example → self-recall → grade → next) that calls the
  *exact same* `gradeVocab`/`SRS.schedule` path Review already used — a
  word learned here and a word reviewed later are the same DB record,
  not two mastery systems. Where a real exercise already exists for a
  word, a genuine "Try a real exercise" button launches the actual
  exercise engine instead of a fabricated one.
- **Dictionary** gained A-Z browsing, the tiered search above, word-type/
  level/gender filters, and a real per-word detail page. A shared
  `wordProfileBody()` renders the same facts (word-type-aware grammar
  block — a verb never shows "der", an adjective never shows a plural;
  examples; synonyms/opposites/collocations; common mistakes; related
  grammar and lessons) for both the Dictionary detail view and the
  Vocabulary detail view, so the two screens can't drift out of sync.
- **"Add to Learning"** reuses the pre-existing `dict-add-review` action
  (which creates a fresh SRS record via `getVocabItem`) — the same code
  path Dictionary already used before this phase, now also reachable
  from the Vocabulary detail page and the dashboard. **Favorites** were
  already unified between the two screens before this phase (both read
  `profile.favorites` with the same `'v:'+id` key) — verified, not
  rebuilt.

### What this phase deliberately did not build

Full morphological generation (a real German stemmer/conjugator) —
explicitly out of scope per the phase's own instruction not to fake
unreliable forms; the inflected-form map is real but intentionally small
and hand-verified rather than generated. Audio, speech recognition, and
AI-backed dictionary enrichment remain exactly as unavailable as they
were before this phase — nothing here pretends otherwise. Search result
lists are capped (80 per A-Z letter, 20 per search tier) rather than
rendering the whole dataset into the DOM at once, per the phase's
performance instruction — at ~650 words this is a comfort margin, not a
necessity yet, but it keeps the same code correct as the dictionary grows.

## Phase 4.5 — search reliability, mistake integration, cross-linking, data audit

Phase 4.5 was explicitly a reliability/quality phase, not a content-expansion
phase: fix the gaps the Phase 4 report itself disclosed, before a much
larger vocabulary expansion happens later.

### Multilingual search (the primary fix)

`DictionaryService.search()` previously only ever matched German and
English — `v.translations.ur`/`.ps` were stored and displayed but never
searched. This is now fixed via a proper search index:

- **`buildSearchIndex()`** precomputes one normalized record per
  vocabulary entry (German headword, lemma, English gloss parts, Urdu,
  Pashto, and a `related` bucket of synonyms/collocations) from the
  `VOCAB` source of truth, memoized the same way the A-Z index already
  was. Every search tier reads from this instead of re-normalizing raw
  fields on every keystroke.
- **`normUnicode()`** does Unicode NFC composition plus stripping the
  *optional* Arabic-script diacritics (harakat, U+064B–U+0652, U+0670)
  before comparison — this is deliberately conservative: it does **not**
  fold visually-similar-but-distinct letters (Arabic ي vs Urdu ی, or any
  of Pashto's ښ/ږ/ړ/ڼ/ګ/ې/ۍ against a nearer Arabic relative), exactly
  per the phase's own instruction not to risk conflating different words.
  German normalization (umlauts, ß) was already handled by keeping a
  separate matching key and never touching the stored/displayed `de`
  field — verified, not changed, by `tests/test_phase4_5.js`.
- **Ranking** now follows the phase's exact specified order: exact German
  lemma → exact inflected form → exact translation (EN/UR/PS together) →
  German prefix → translation prefix (new) → partial match → related
  searchable form (new, synonyms/collocations) → fuzzy suggestion. Two
  new tiers (`translationPrefix`, `related`) were added to the result
  shape; the original tier names were kept unchanged so nothing that
  already read `res.exact`/`res.prefix`/etc. had to change.
- Ranking never consults the learner's CEFR level or mastery — verified
  by a test that calls `search()` with and without an empty options
  object and asserts identical ordering. Personalization stays a
  separate layer (`LearningService`), never a dictionary-ranking input.

### Vocabulary ↔ mistake integration

`schema.js`'s `normalizeVocab` gained a `commonMistakeIds` array
(alongside the pre-existing free-text `commonMistakes` strings) —
stable IDs into `COMMON_MISTAKES`, not duplicated mistake objects. The
DSL's compact authoring format gained a matching `+mistakeIds:` extra.
Ten vocabulary entries were linked to a real, already-existing
`COMMON_MISTAKES` record, chosen only where the connection is
unambiguous (the mistake's own wrong/right example literally uses that
word: `gehen`↔`mk_perfekt_sein_verb`, `helfen`↔`mk_dativ_helfen_akk`,
`mögen`/`gern`/`schwimmen`↔`mk_gern_vs_mogen`, `weil`/`denn`↔their
respective word-order mistakes, `doch`↔`mk_modalpartikel_position`,
`Lehrer`↔`mk_professions_article`, `sich interessieren`↔
`mk_reflexiv_pronoun_dropped`). `wordProfileBody()` renders any linked
mistake as ❌ wrong / ✅ right / **Why?** explanation, using the real
`COMMON_MISTAKES` record — no invented mistakes. The content validator
now errors if a `commonMistakeIds` entry doesn't resolve to a real
record, so a broken link can't silently ship.

### Polysemy / structured senses

Two words the phase named explicitly — **Bank** (bank vs bench) and
**laufen** (to run / to walk / to function) — previously crammed multiple
meanings into one comma-separated `en` string. Both now carry a `senses`
array (`{en, example:{de,en}}` per sense) attached as a targeted
post-processing step in `vocabulary.core.js`, not a schema-wide rewrite
of all 600+ entries. `wordProfileBody()` renders `senses` as a numbered
list with its own example per sense when present, falling back to the
plain single `en` gloss otherwise — every other word is unaffected.

### Reading / Speaking / Writing cross-linking

- **Reading**: every German word in a reading passage is now wrapped in
  a `<span role="button" tabindex="0">` (via `clickableWords()`) that
  resolves through `resolveClickedWord()` — an exact headword match
  (either case) or the same `DictionaryService.lookupInflected` index
  search already uses — and opens an inline lookup panel below the text
  (never a full navigation, so reading progress/scoring/exercises are
  completely untouched). An unmapped word shows an honest "no entry
  found" panel with a "search dictionary for this" fallback — it never
  fabricates an entry. A global keydown handler was added so Enter/Space
  activates these spans for keyboard users, since a `<span>` doesn't get
  that behavior for free the way a `<button>` does.
- **Speaking**: task prompts and key phrases use the same
  `clickableWords()` tokenizer, plus a genuinely-derived (not
  hand-picked) "Target vocabulary" list built by resolving every word in
  the task text through the same resolver and keeping only real hits.
- **Writing**: a small, non-intrusive "Suggested vocabulary" line above
  the editor, using the same derivation — the editor/textarea itself was
  deliberately left untouched, per the phase's instruction not to turn
  writing into an intrusive dictionary UI.

### Data audit findings (documented, not silently fixed away)

- Zero broken lesson/grammar/mistake references found across all 657
  vocabulary entries (content validator: 0 errors, 0 warnings).
- Zero empty, placeholder (TODO/TBD/etc.), or cross-language-contaminated
  translation fields found.
- Two **intentional** Urdu/Pashto homographs were found and verified,
  not fixed, because they're linguistically correct: Urdu میں legitimately
  means both "I" and "in"; Urdu وہ and Pashto هغه are genuinely
  gender-neutral third-person pronouns covering both "er" and "sie" in
  German. These are documented here rather than silently merged or
  flagged as errors.
- `INFLECTIONS_BY_LEMMA` replaced the old flat `IRREGULAR_FORMS` map as
  the primary authored structure (grouped `lemma → surface forms[]`,
  with `IRREGULAR_FORMS` now *derived* from it) — the structure spec §20
  asked for, without changing any of the ~90 already-verified forms.

### What this phase deliberately did not build

No new massive vocabulary (114 words were added in Phase 4; Phase 4.5
added exactly 3 new words — Wasser, plus Urdu/Pashto for two existing
ones — solely to make the spec's own named acceptance journeys real
instead of hypothetical). No AI, no audio, no speech recognition, no
real morphological analyzer — the inflection map is still ~90 hand-
verified forms, now better organized, explicitly not presented as
complete. Fuzzy/typo-tolerant matching for Urdu/Pashto script was not
attempted (only exact/partial); Levenshtein-based fuzzy suggestions
remain German-only, where the existing implementation was already
reliable.

## Phase 5 — targeted vocabulary expansion (657 → 753)

Phase 5 asked for a "massive" expansion across A0–C2. Given the realistic
scope achievable in one implementation pass, this phase deliberately
prioritized **fixing the specific, measurable imbalance Phase 4.5's own
audit found** over chasing a large raw count: A1 alone held 301 of 657
words while B1–C2 combined held only 174, and B2/C1/C2 had **zero**
adverbs and **zero** conjunctions between them — a serious gap for
anything beyond beginner communication.

### What was added

`src/content/vocabulary.expansion2.js` — 96 new, hand-written entries,
weighted almost entirely toward the weak levels and the missing word
types:

| Level | Before | After | Change |
|---|---|---|---|
| A0 | 63 | 63 | — (already adequate for a foundation layer) |
| A1 | 301 | 301 | — (already comprehensive; effort went elsewhere) |
| A2 | 119 | 134 | +15 (discourse markers, environment, media) |
| B1 | 75 | 102 | +27 (adverbs, connectors, work/education, society) |
| B2 | 54 | 76 | +22 (discourse connectors, argument vocabulary, economy/tech) |
| C1 | 24 | 42 | +18 (academic nominal style, formal connectors, idioms) |
| C2 | 21 | 35 | +14 (nuance/register vocabulary, formal connectors, idioms) |
| **Total** | **657** | **753** | **+96** |

Word-type shift: adverbs 34→62 (nearly doubled), conjunctions 10→19
(nearly doubled) — directly targeting the audit's clearest gap. B2, C1
and C2 each went from **zero** adverbs and **zero** conjunctions to at
least several of each (verified by `tests/test_phase5.js`).

### Method, following the established pattern exactly

Same DSL, same content-pack architecture, same quality bar as every
prior pack — nothing new was invented. Every line is hand-written,
checked German with a real example sentence. Duplicate-ID collisions
against the existing 657 entries were checked and resolved before
merging (13 were found and removed — words like `deshalb`, `trotzdem`,
`Voraussetzung`, `Tragweite` already existed from earlier phases; the
already-existing entry was kept in every case, nothing was overwritten).
The full content validator (extended in Phase 4.5) reports zero errors
and zero warnings across the complete 753-entry merged graph.

### What this phase deliberately did not do

It did not attempt thousands of new entries, did not touch A0/A1 (already
strong), did not expand Urdu/Pashto coverage (Phase 4.5 already
established the "curated, high-confidence only" policy and this phase
didn't have new high-confidence translations to add beyond the existing
35), and did not restructure the schema — every new entry uses exactly
the same fields Phase 4/4.5 already established (`senses`,
`commonMistakeIds`, `translations`, `topicTags`, etc.), so search,
A-Z browsing, mistake linking, and every existing UI screen picked up
the new vocabulary automatically with no code changes beyond the four
one-line registry/index.html/test-harness wiring edits every previous
content pack has needed.

### Honest continuation plan for a future phase

Real remaining gaps, in priority order: (1) A2 is still thin on
pronouns/determiners relative to A1; (2) B1–C2 nouns/verbs, while now
present, are still far short of a "broad dictionary" — this phase added
function words and discourse markers specifically, not bulk topical
vocabulary; (3) dictionary-only (non-curriculum) vocabulary — the
Layer 3 the spec described — was not started this phase; (4) domain/
technical vocabulary (medicine, law, engineering) remains essentially
absent. A future phase should tackle these as separate, similarly-sized
batches (roughly 100–150 words each) rather than one enormous pass, for
the same reason this phase didn't: reviewable quality control per batch.

## Phase 13 — lazy, indexed master dictionary

* `src/lexicon/lexiconCore.js` — pure logic: key normalisation, index-row building (`toRow`), the ranked
  `SearchEngine`, an in-memory test backend. Same code runs in Node tests and in the browser.
* `src/lexicon/lexiconStore.js` — IndexedDB database **`wegweiser_lexicon`** (separate from `wegweiser_db`):
  `lemmas` (full untouched records + one combined multiEntry index `i`), `keytab` (packed key projection for
  substring/typo search), `meta` (build state). Built lazily and resumably, per source chunk, on first dictionary use.
* `app.js` no longer loads the master lexicon at startup. `VOCAB` holds curated + deliberately-added words only;
  master results are fetched asynchronously per query (`dictMasterSync`) and rendered into `#dictMaster`.
* `wegweiser_db` v4 adds `learnedLexicon` (snapshot of master words the learner added to Learning).
* `src/services/masterLexiconRuntime.js` is kept only for `MasterLexiconBridge` (entry shape, dedupe key) and
  Node tooling; the app does not call its eager loader any more.

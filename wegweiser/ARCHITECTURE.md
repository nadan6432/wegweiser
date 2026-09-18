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

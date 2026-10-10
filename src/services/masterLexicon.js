/* ============================================================
   MASTER LEXICON SERVICE (Phase 6 spec §28-37, §72-75)

   The three-layer model:
     Layer 1  Core learning vocabulary   -> existing VOCAB (curated)
     Layer 2  Extended CEFR vocabulary   -> existing VOCAB (curated, by level)
     Layer 3  Master dictionary          -> THIS service's dictionaryOnly set

   Layer 3 entries never enter VOCAB, SRS, daily plan, or lessons on
   their own (spec §72). "Add to Learning" is the only path from Layer 3
   into the learner-facing system, and it reuses the exact same
   DB.get-or-create pattern the existing dictionary already uses for
   curated words (see tests/test_phase5.js's idempotency test) — so a
   dictionary-only word's `lex_*` id works as a progress-record key
   exactly the same way a curated word's `v_*` id does. Nothing new is
   invented for SRS; this only decides what's ELIGIBLE to be added.

   This module intentionally does NOT get spliced into Registry.apply()
   or window.VOCAB — see data/processed/README (if present) and
   SOURCE_LICENSE.md for why the data behind it isn't yet at real scale.
   Wiring the Dictionary UI to browse this is a deliberate follow-up
   once a real bulk source has been imported (spec §79: don't claim
   scale the app doesn't actually have).
   ============================================================ */
'use strict';

function loadProcessedLexicon(fs, path, repoRoot){
  const file = path.join(repoRoot, 'data/processed/master-lexicon.json');
  if(!fs.existsSync(file)) return { masterLexicon: [], dictionaryOnly: [] };
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { masterLexicon: parsed.masterLexicon || [], dictionaryOnly: parsed.dictionaryOnly || [] };
}

function buildFormIndex(masterLexicon){
  // surface form (any case/number) -> lemma id, so a dictionary search
  // for "Fahrrädern" can resolve to the "Fahrrad" master record
  // (spec §16 "the dictionary search should be able to recognize an
  // inflected form and find the lemma").
  const index = new Map();
  masterLexicon.forEach(rec => {
    if(!rec.forms) return;
    Object.keys(rec.forms).forEach(grammCase => {
      const numbers = rec.forms[grammCase] || {};
      Object.keys(numbers).forEach(number => {
        const form = numbers[number];
        if(form) index.set(form.toLowerCase(), rec.id);
      });
    });
  });
  return index;
}

function createMasterLexiconService({ masterLexicon, dictionaryOnly }){
  const byId = new Map(masterLexicon.map(r => [r.id, r]));
  const formIndex = buildFormIndex(masterLexicon);

  function counts(){
    // Report lemmas and forms SEPARATELY (spec §37/§67/§68) — never
    // collapse "25,000 lemmas + 180,000 forms" into one misleading number.
    let formCount = 0;
    masterLexicon.forEach(r => {
      if(!r.forms) return;
      Object.keys(r.forms).forEach(c => { formCount += Object.keys(r.forms[c]).length; });
    });
    const byWordType = {};
    const byCefr = {};
    masterLexicon.forEach(r => {
      byWordType[r.wordType] = (byWordType[r.wordType] || 0) + 1;
      byCefr[r.cefr || 'unknown'] = (byCefr[r.cefr || 'unknown'] || 0) + 1;
    });
    return {
      masterLexiconLemmas: masterLexicon.length,
      inflectedForms: formCount,
      dictionaryOnlyLemmas: dictionaryOnly.length,
      byWordType,
      byCefr, // 'unknown' is always a real, visible bucket here (spec §36)
    };
  }

  /* Word-form-aware lookup: exact lemma match first, then fall back to
     the surface-form index (spec §16, §71's "ging" -> "gehen" example). */
  function lookup(term){
    const q = String(term || '').trim();
    if(!q) return { query: term, exact: null, formOf: null };
    const exact = masterLexicon.find(r => r.lemma.toLowerCase() === q.toLowerCase());
    if(exact) return { query: term, exact, formOf: null };
    const lemmaId = formIndex.get(q.toLowerCase());
    if(lemmaId) return { query: term, exact: null, formOf: byId.get(lemmaId) };
    return { query: term, exact: null, formOf: null };
  }

  function filterByWordType(wordType){
    return masterLexicon.filter(r => r.wordType === wordType);
  }
  function filterByCefr(cefr){
    return masterLexicon.filter(r => (r.cefr || 'unknown') === cefr);
  }

  function azBrowse(letter){
    const L = letter.toUpperCase();
    return masterLexicon
      .filter(r => r.lemma.charAt(0).toUpperCase() === L)
      .sort((a, b) => a.lemma.localeCompare(b.lemma, 'de'));
  }

  /* Eligible for "Add to Learning" — anything in the dictionary that
     isn't already a REJECTED-quality record (spec §73). This function
     deliberately does NOT touch SRS/DB itself: the actual get-or-create
     is the app's existing DB.get('vocabProgress', id) / SRS.freshItem(id)
     / DB.put pattern (tests/test_phase5.js), unchanged. This just answers
     "is this id allowed to be added" and hands back the record to add. */
  function getAddableRecord(id){
    const rec = dictionaryOnly.find(r => r.id === id) || byId.get(id);
    if(!rec) return null;
    if(rec.quality && rec.quality.status === 'REJECTED') return null;
    return rec;
  }

  return { counts, lookup, filterByWordType, filterByCefr, azBrowse, getAddableRecord, byId, formIndex };
}

module.exports = { createMasterLexiconService, loadProcessedLexicon, buildFormIndex };

/* ============================================================
   MASTER LEXICON RUNTIME (Phase 9)

   Bridges the Phase 8 master lexicon (5,105 authored/sourced lemmas,
   chunked under data/processed/master/) into the SAME VOCAB-shaped
   object the rest of the app (DictionaryService, dictResultCard,
   renderDictionaryDetail, vocabById, SRS) already knows how to render
   and track — rather than teaching every one of those a second data
   shape. `toDictionaryEntry()` is the one place that translation
   happens; everything downstream is unchanged app code operating on
   a pool that now happens to contain both curated and master entries.

   Two loaders share that normalizer:
     - Node (`loadAllNode`): reads the chunk files straight off disk —
       used by tests and any server-side tooling.
     - Browser (`MasterLexiconRuntime.init`): fetches manifest.json then
       each per-letter chunk, caching each chunk's raw JSON text in
       IndexedDB (via the existing DB wrapper, new 'masterLexiconCache'
       store — see db.js) so a repeat launch reads from cache first and
       only re-fetches a chunk if it's missing or the manifest's
       pipelineVersion changed. This is what keeps the app usable
       offline after the first successful load (spec §Phase 6/9 "avoid
       downloading the entire dictionary from a server on every launch").

   Curated-precedence merge (spec Phase 5/9): a master entry whose
   normalized lemma+word-type collides with an existing curated entry
   is EXCLUDED from the merged pool — the curated record (richer:
   Urdu/Pashto, real examples, lesson links, SRS-ready) already
   represents that word, and showing a second, poorer master
   duplicate next to it would just be clutter, not "no duplicates ever
   for that word". Different-word-type homographs are NOT collapsed —
   they don't share a normalizedLemma key, so both survive.
   ============================================================ */
'use strict';

function stripArticle(s){
  return String(s||'').trim().replace(/^(der|die|das)\s+/i,'');
}
function dedupeKey(lemma, wordType){
  const base = stripArticle(lemma).toLowerCase().normalize('NFC').replace(/[.,!?;:'"()]/g,'');
  return base + '::' + familyOf(wordType);
}
/* Coarser than the master lexicon's own wordType, matching the exact
   family grouping tools/lexicon/merge.js already uses for the offline
   import-time merge — kept in sync deliberately so "the same word" means
   the same thing whether it was deduped at import time or at runtime. */
function familyOf(wordType){
  const FAMILY = { noun:'noun', verb:'verb', adjective:'adj', adverb:'adv',
    phrase:'phrase', idiom:'phrase', proper_noun:'noun' };
  return FAMILY[wordType] || 'func';
}

/* ---------------- normalizer: master record -> VOCAB shape ---------------- */
function toDictionaryEntry(rec){
  const en = (rec.translations && rec.translations.en && rec.translations.en.length)
    ? rec.translations.en.join('; ')
    : (rec.meanings || []).join('; ');
  const ur = (rec.translations && rec.translations.ur && rec.translations.ur.length) ? rec.translations.ur.join('; ') : '';
  const ps = (rec.translations && rec.translations.ps && rec.translations.ps.length) ? rec.translations.ps.join('; ') : '';
  const examples = (rec.examples || []).filter(e => e && e.de);
  return {
    id: rec.id,
    de: rec.article ? (rec.article + ' ' + rec.lemma) : rec.lemma,
    lemma: rec.lemma,
    article: rec.article || '',
    type: rec.wordType,               // may be outside Schema.WORD_TYPES (subjunction, modal_particle, proper_noun) — app.js's label map is extended for these (Phase 9)
    sourcePos: rec.sourcePos || null,
    level: rec.cefr || 'unknown',     // 'unknown' is a real, displayable value here, never fabricated to a real level
    cefrBasis: rec.cefrBasis || null, // e.g. 'authored-estimate' — the UI must show this is NOT an official classification
    plural: rec.plural || '',
    en,
    translations: { ur, ps },
    ex_de: examples[0] ? examples[0].de : '',
    ex_en: examples[0] ? examples[0].en : '',
    examples: examples.slice(1),
    synonyms: rec.synonyms || [],
    opposites: rec.antonyms || [],
    collocations: rec.collocations || [],
    commonMistakes: [],               // never fabricated (spec: no fake common mistakes)
    topic: rec.domain || '',
    morphology: rec.morphology || {},
    surfaceForms: rec.surfaceForms || [],
    quality: rec.quality || null,
    sources: rec.sources || [],
    provenance: rec.provenance || null,
    dictionaryOnly: true,             // the flag every UI branch below checks
  };
}

/* Build the surface-form -> entry index once per load, so "ging" or
   "Häuser" resolve to their lemma's normalized entry without a linear
   scan of every record's surfaceForms array per keystroke. */
function buildFormIndex(entries){
  const idx = new Map();
  entries.forEach(e => (e.surfaceForms || []).forEach(f => {
    const k = String(f).toLowerCase().normalize('NFC');
    if(!idx.has(k)) idx.set(k, []);
    if(!idx.get(k).includes(e)) idx.get(k).push(e);
  }));
  return idx;
}

/* ---------------- curated-precedence merge ---------------- */
function mergedPool(curatedVocab, masterEntries){
  const curatedKeys = new Set(curatedVocab.map(v => dedupeKey(v.lemma || v.de, v.type)));
  const kept = masterEntries.filter(e => !curatedKeys.has(dedupeKey(e.lemma, e.type)));
  return curatedVocab.concat(kept);
}

function wordTypesPresent(entries){
  return Array.from(new Set(entries.map(e => e.type))).sort();
}

/* Resolve an id against curated first, then the (already deduped) master
   pool — used by "Add to Learning" and the detail view so both id spaces
   share one lookup function (spec Phase 5: never invent a second SRS
   keying scheme). */
function entryById(id, curatedVocab, masterEntries){
  const c = curatedVocab.find(v => v.id === id);
  if(c) return c;
  return masterEntries.find(e => e.id === id) || null;
}

/* ---------------- Node loader (tests / tooling) ---------------- */
function loadAllNode(masterDir){
  const fs = require('fs');
  const path = require('path');
  const manifestPath = path.join(masterDir, 'manifest.json');
  if(!fs.existsSync(manifestPath)) return { entries: [], manifest: null };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const records = [];
  manifest.chunks.forEach(c => {
    const p = path.join(masterDir, 'lemmas', c.letter + '.json');
    if(fs.existsSync(p)) records.push(...JSON.parse(fs.readFileSync(p, 'utf8')));
  });
  return { entries: records.map(toDictionaryEntry), manifest };
}

/* ---------------- browser runtime ---------------- */
const MasterLexiconRuntime = (() => {
  let entries = [];
  let formIndex = new Map();
  let loaded = false;
  let loadError = null;
  let loadPromise = null;

  async function readCachedChunk(letter){
    if(typeof DB === 'undefined') return null;
    try{ return await DB.get('masterLexiconCache', 'chunk:'+letter); }
    catch(e){ return null; }
  }
  async function writeCachedChunk(letter, json, version){
    if(typeof DB === 'undefined') return;
    try{ await DB.put('masterLexiconCache', { id:'chunk:'+letter, letter, json, version }); }
    catch(e){ /* cache is best-effort; a failed write must never block loading */ }
  }
  async function readCachedManifest(){
    if(typeof DB === 'undefined') return null;
    try{ return await DB.get('masterLexiconCache', 'manifest'); }
    catch(e){ return null; }
  }
  async function writeCachedManifest(manifest){
    if(typeof DB === 'undefined') return;
    try{ await DB.put('masterLexiconCache', { id:'manifest', manifest }); }
    catch(e){ /* best-effort */ }
  }

  /* One chunk, cache-first: if a cached copy exists AND matches the
     manifest's pipelineVersion, use it without any network request at
     all (spec: "previously downloaded dictionary data remains available
     offline", "avoid downloading the entire dictionary on every launch").
     A network failure with a hit in a STALE cache still uses the stale
     cache rather than showing nothing — better an old Phase-8 dataset
     than an empty dictionary. */
  async function loadChunk(letter, version, baseUrl){
    const cached = await readCachedChunk(letter);
    if(cached && cached.version === version) return JSON.parse(cached.json);
    try{
      const res = await fetch(baseUrl + 'lemmas/' + letter + '.json');
      if(!res.ok) throw new Error('http ' + res.status);
      const text = await res.text();
      writeCachedChunk(letter, text, version); // fire-and-forget
      return JSON.parse(text);
    }catch(networkErr){
      if(cached){ return JSON.parse(cached.json); } // stale-but-present beats nothing
      throw networkErr;
    }
  }

  async function init(baseUrl){
    if(loadPromise) return loadPromise; // idempotent: a second call while loading just awaits the same load
    baseUrl = baseUrl || 'data/processed/master/';
    loadPromise = (async () => {
      let manifest;
      try{
        const res = await fetch(baseUrl + 'manifest.json');
        if(!res.ok) throw new Error('http ' + res.status);
        manifest = await res.json();
        writeCachedManifest(manifest);
      }catch(networkErr){
        const cachedManifest = await readCachedManifest();
        if(cachedManifest){ manifest = cachedManifest.manifest; }
        else { loadError = networkErr; loaded = true; return; } // no network, no cache: dictionary stays curated-only, and the UI must say so (Phase 6 §8: handle missing chunks gracefully)
      }
      const version = manifest.pipelineVersion || 'unknown';
      const records = [];
      for(const c of manifest.chunks){
        try{ records.push(...await loadChunk(c.letter, version, baseUrl)); }
        catch(chunkErr){ /* one missing/corrupt chunk must not sink the whole dictionary — skip it, keep the rest */ }
      }
      entries = records.map(toDictionaryEntry);
      formIndex = buildFormIndex(entries);
      loaded = true;
    })();
    return loadPromise;
  }

  function getEntries(){ return entries; }
  function getFormIndex(){ return formIndex; }
  function isLoaded(){ return loaded; }
  function getLoadError(){ return loadError; }

  return { init, getEntries, getFormIndex, isLoaded, getLoadError, toDictionaryEntry, mergedPool, entryById, wordTypesPresent, buildFormIndex, dedupeKey };
})();

const MasterLexiconBridge = { toDictionaryEntry, mergedPool, entryById, wordTypesPresent, buildFormIndex, dedupeKey, loadAllNode, familyOf, stripArticle };

if(typeof module !== 'undefined' && module.exports){ module.exports = MasterLexiconBridge; }
if(typeof window !== 'undefined'){ window.MasterLexiconRuntime = MasterLexiconRuntime; window.MasterLexiconBridge = MasterLexiconBridge; }

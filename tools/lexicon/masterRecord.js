/* ============================================================
   MASTER LEXICON RECORD (Phase 6 spec §9, §57)

   Builds one master-lexicon record from a raw parsed + classified
   source record. This is the "does this German lexical item exist and
   what do we know about it" layer (spec §8) — deliberately separate
   from learning metadata (CEFR here is always 'unknown' unless a
   trusted source said otherwise; nothing here decides what a learner
   studies, see mergeLayer.js).

   Stable IDs (spec §57): derived deterministically from the normalized
   lemma + word type (+ sense index when needed), never from array
   position or a random value, so re-running the importer on an updated
   source never reshuffles IDs under a learner's existing SRS/favorites.
   ============================================================ */
'use strict';

const { dedupeKey, stripArticle } = require('./normalize.js');

const ARTICLE_FOR_GENDER = { m: 'der', f: 'die', n: 'das' };

function stableId(lemma, wordType, senseIndex){
  // transliterate for the ID only (lemma keeps its umlauts) so Bär/Bar-type
  // pairs can never collide (Phase 8)
  const key = dedupeKey(lemma, wordType).replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return 'lex_' + key + (senseIndex ? '_s' + senseIndex : '');
}

/* Turns the adapter's flat `forms` map (e.g. {'nominativ singular': 'Fahrrad', ...})
   into a small structured case table, without inventing any values —
   whatever the source didn't provide simply stays absent (spec §12, §45:
   "do not invent missing morphology"). */
function buildCaseTable(forms){
  const table = {};
  Object.keys(forms || {}).forEach(key => {
    const m = key.match(/^(nominativ|genitiv|dativ|akkusativ)\s+(singular|plural)\*?$/);
    if(!m) return;
    const [, grammCase, number] = m;
    table[grammCase] = table[grammCase] || {};
    // Prefer the first (primary) form seen for a case+number; a
    // "*"-suffixed alternate column is kept only if we don't already
    // have a primary value, so the record stays one value per slot
    // rather than silently overwriting a preferred form with a variant.
    if(!table[grammCase][number]) table[grammCase][number] = forms[key];
  });
  return table;
}

function buildMasterRecord({ raw, classification, sourceLabel, importDate }){
  const wordType = classification.wordType || 'unknown';
  const lemma = stripArticle(raw.lemma) || raw.lemma;
  const cases = wordType === 'noun' ? buildCaseTable(raw.forms) : null;
  // Two different noun-form shapes feed this: german-nouns-csv's full
  // "nominativ plural" case table, and kaikki.org's flatter {genitive,
  // plural} tag map (see sourceAdapters.js) — try the case table first,
  // then the flat tag directly, rather than requiring one fixed shape.
  const plural = (cases && cases.nominativ && cases.nominativ.plural)
    || (raw.forms && raw.forms.plural)
    || '';
  const article = raw.gender ? ARTICLE_FOR_GENDER[raw.gender] : '';

  const senses = raw.senses || [];
  const meanings = senses.reduce((acc, s) => acc.concat(s.glosses || []), []);
  const examples = senses.filter(s => s.example && s.example.de).map(s => s.example).slice(0, 5);

  return {
    id: stableId(lemma, wordType),
    lemma,
    normalizedLemma: dedupeKey(lemma, wordType),
    language: 'de',
    wordType,               // Schema.WORD_TYPES value, or master-only (proper_noun) / 'unknown'
    sourcePos: raw.sourceWordType || null, // original source POS label, never discarded (Phase 7 §8)
    layer: 'MASTER_DICTIONARY',
    curated: false,
    surfaceForms: raw.allForms || [],       // flat inflected surface forms -> lemma search index
    subType: null,

    article: article || '',
    gender: raw.gender || null,
    plural: plural || '',

    meanings,               // English glosses, only when the source actually provides them (kaikki.org)
    senses: senses.map(s => ({ glosses: s.glosses || [], tags: s.tags || [] })),

    forms: cases,           // full case/number table for nouns, null otherwise (spec §17)
    inflections: raw.verbForms || null, // compact verb forms from kaikki.org (present-3sg, past, participle, auxiliary)

    pronunciation: raw.ipa || null,     // only ever the source's own IPA — never fabricated (spec §46)
    variants: [],
    compounds: [],
    separable: null,
    reflexive: null,

    register: null,
    domain: null,
    frequency: null,        // not fabricated — only set when a source actually provides it (spec §26)

    // Reproduced under kaikki.org/Wiktionary's CC BY-SA license, which
    // permits this with attribution (see SOURCE_LICENSE.md) — a small,
    // per-sense excerpt, not a bulk copy of copyrighted third-party prose
    // (spec §50: verify licensing before importing examples).
    examples,
    collocations: [],
    synonyms: [],
    antonyms: [],
    relatedWords: [],

    cefr: 'unknown',        // never fabricated (spec §25)

    quality: {
      status: classification.status,          // VALID | WARNING | REJECTED
      reasons: classification.reasons || [],
    },

    sources: [raw.sourceName],
    provenance: {
      sourceName: raw.sourceName,
      sourceLabel: sourceLabel,
      sourceId: raw.sourceId,
      importDate: importDate,
    },
  };
}

module.exports = { stableId, buildCaseTable, buildMasterRecord, ARTICLE_FOR_GENDER };

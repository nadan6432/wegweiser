/* ============================================================
   SOURCE ADAPTERS (Phase 6 spec §7)

   Every external lexical source gets its own adapter that turns that
   source's native format into one common "raw parsed record" shape:

     {
       lemma: string,            // headword exactly as the source gives it
       sourceWordType: string,   // the source's own POS label, unmapped
       gender: 'm'|'f'|'n'|null,
       forms: { [caseNumberKey: string]: string },  // e.g. 'nominativ singular': 'Fahrrad'
       sourceId: string,         // stable-ish identifier from the source, or the lemma itself
       sourceName: string,       // which adapter/source this came from (provenance, spec §22)
     }

   classify.js later maps `sourceWordType` onto Schema.WORD_TYPES, so an
   adapter never has to know about Wegweiser's own category names — this
   is what keeps adding a second source (verbs, adjectives, function
   words) a matter of writing one more adapter, not touching the pipeline
   (spec §7, §41 "SourceAdapter ├── Source A ├── Source B ├── Source C").
   ============================================================ */
'use strict';
const { repairRecordStrings } = require('./mojibake.js');

/* ---------------- minimal CSV parsing ----------------
   No external dependency — the sources this project has verified so far
   are simple comma-separated files with a header row and no embedded
   newlines. A source with quoted/escaped fields would need a real CSV
   parser; this is intentionally not that, so it fails loudly instead of
   silently mis-parsing something it doesn't understand. */
function parseCsv(text){
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.length > 0);
  if(lines.length === 0) return { header: [], rows: [] };
  const splitLine = (line) => line.split(',').map(cell => cell.trim());
  const header = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine);
  return { header, rows };
}

/* ---------------- Source: german-nouns (gambolputty) ----------------
   See SOURCE_LICENSE.md for license/provenance. CSV columns confirmed
   against the project's published lookup examples: `pos`, `genus`,
   `lemma`, plus one column per case/number combination (e.g.
   "nominativ singular", "genitiv singular*" for the alternate genitive).
   NOTE: the exact header row of the real 19.3 MB nouns.csv has not been
   inspected directly in this environment (see data/raw/german-nouns-
   wiktionary/NOTE.md) — this adapter matches columns by pattern rather
   than a fixed positional layout, so minor header differences in the
   real file (extra columns, different ordering) should still parse;
   re-verify against the real header row before a production run. */
const GermanNounsCsvAdapter = {
  name: 'german-nouns-csv',
  sourceLabel: 'german-nouns (gambolputty, via German Wiktionary)',

  canParse(text){
    const firstLine = text.slice(0, 500).split('\n')[0] || '';
    return /\blemma\b/i.test(firstLine) && /\bgenus\b/i.test(firstLine);
  },

  parse(text){
    const { header, rows } = parseCsv(text);
    const idx = {};
    header.forEach((col, i) => { idx[col.toLowerCase()] = i; });
    if(idx.lemma === undefined){
      throw new Error('GermanNounsCsvAdapter: no "lemma" column found in header: ' + header.join(','));
    }
    const formColumns = header
      .map((col, i) => ({ col, i }))
      .filter(({ col }) => /^(nominativ|genitiv|dativ|akkusativ)\s+(singular|plural)\*?$/i.test(col.trim()));

    return rows.map((cells, rowIndex) => {
      const lemma = (cells[idx.lemma] || '').trim();
      const genusRaw = idx.genus !== undefined ? (cells[idx.genus] || '').trim().toLowerCase() : '';
      const gender = ({ m: 'm', f: 'f', n: 'n' })[genusRaw] || null;
      const posRaw = idx.pos !== undefined ? (cells[idx.pos] || '').trim() : 'Substantiv';
      const forms = {};
      formColumns.forEach(({ col, i }) => {
        const v = (cells[i] || '').trim();
        if(v) forms[col.trim().toLowerCase()] = v;
      });
      return {
        lemma,
        sourceWordType: posRaw || 'Substantiv',
        gender,
        forms,
        sourceId: lemma ? lemma + '#' + rowIndex : 'row' + rowIndex,
        sourceName: GermanNounsCsvAdapter.name,
      };
    }).filter(r => r.lemma);
  },
};

/* ---------------- Source: kaikki.org Wiktextract (German) ----------------
   See SOURCE_LICENSE.md. Real schema confirmed directly from kaikki.org's
   own per-word pages (e.g. https://kaikki.org/dictionary/German/meaning/g/ge/gehen.html),
   which publish the exact JSON object this adapter parses — one such
   object per line in the real bulk JSONL (https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl,
   ~1GB, not downloadable in this environment; see NOTE.md). Each line is
   one word-sense-group object: { word, pos, lang_code, forms:[{form,tags}],
   senses:[{glosses,tags,examples}], sounds:[{ipa}], ... }. */
const WiktextractJsonlAdapter = {
  name: 'wiktextract-jsonl',
  sourceLabel: 'kaikki.org Wiktextract (German), by tatuylonen',

  canParse(text){
    const firstLine = (text.split('\n').find(l => l.trim()) || '').trim();
    if(!firstLine.startsWith('{')) return false;
    try { const obj = JSON.parse(firstLine); return 'word' in obj && 'pos' in obj; }
    catch(e){ return false; }
  },

  /* Streaming-friendly: one JSONL line -> zero or one raw record. The
     real German dump is ~1 GB, so pipeline.runImportStreaming feeds this
     line by line instead of loading the file (spec Phase 7 §22/46).
     Returns null for non-German, malformed, or empty lines.
     Inflected-form entries (Wiktextract emits e.g. "ging" as its own
     entry whose senses are all form_of/alt_of another word) are returned
     with `formOf` set instead of being treated as lemmas, so they can be
     attached to the lemma as forms (Phase 7 §7).
     NOTE: the form_of/alt_of field shape is taken from Wiktextract's
     documented output; it has NOT been verified against the bulk file
     here (not downloadable in this environment). */
  parseLine(line, i){
    const t = String(line || '').replace(/^\uFEFF/, '').trim(); // strip a leading UTF-8 BOM (Phase 12 input files carry one per file)
    if(!t) return null;
    let obj;
    try { obj = JSON.parse(t); } catch(e){ return { malformed: true }; }
    // Phase 12: the real uploaded dataset has a pervasive cp1252/UTF-8
    // double-encoding corruption affecting every non-ASCII character
    // (see tools/lexicon/mojibake.js) — repaired here, once, right after
    // parsing, so every field below (word, forms, glosses, examples, ipa)
    // gets the fix for free.
    obj = repairRecordStrings(obj);
    if(obj.lang_code && obj.lang_code !== 'de') return null;
    if(!obj.word || !obj.pos) return null;

    const senses = obj.senses || [];
    const refs = [];
    senses.forEach(s => (s.form_of || s.alt_of || []).forEach(r => { if(r && r.word) refs.push(r.word); }));
    const allFormOf = senses.length > 0 && senses.every(s => (s.form_of && s.form_of.length) || (s.alt_of && s.alt_of.length));
    if(allFormOf && refs.length){
      const tags = [].concat(...senses.map(s => s.tags || [])).filter(x => x !== 'form-of');
      return { formOf: refs[0], form: obj.word, pos: obj.pos, tags: Array.from(new Set(tags)),
               sourceName: WiktextractJsonlAdapter.name };
    }

    const genderTag = senses.length
      ? [].concat(...senses.map(s => s.tags || [])).find(x => x === 'masculine' || x === 'feminine' || x === 'neuter')
      : null;
    const gender = genderTag ? genderTag[0] : null;

    const nounForms = {};
    (obj.forms || []).forEach(f => {
      if(f.source || !f.tags || !f.tags.length) return;
      const k = f.tags.join(' ');
      if(!(k in nounForms)) nounForms[k] = f.form;
    });
    const verbForms = (obj.forms || []).filter(f => !f.source).slice(0, 12);
    const allForms = (obj.forms || []).filter(f => f.form && f.form !== '-' && f.form !== obj.word).map(f => f.form);

    return {
      lemma: obj.word,
      sourceWordType: obj.pos,
      gender,
      forms: nounForms,
      verbForms,
      allForms: Array.from(new Set(allForms)),
      senses: senses.map(s => ({
        glosses: s.glosses || [],
        tags: s.tags || [],
        example: (s.examples && s.examples[0]) ? {
          de: s.examples[0].text || '', en: s.examples[0].english || s.examples[0].translation || '',
        } : null,
      })),
      ipa: ((obj.sounds || []).find(s => s.ipa) || {}).ipa || null,
      sourceId: obj.word + '#' + i,
      sourceName: WiktextractJsonlAdapter.name,
    };
  },

  streaming: true,

  parse(text){
    const out = [];
    text.split('\n').forEach((line, i) => {
      const r = WiktextractJsonlAdapter.parseLine(line, i);
      if(r && !r.malformed && !r.formOf) out.push(r);
    });
    return out;
  },
};

/* ---------------- registry ----------------
   Adding "Source B" (e.g. a future Wiktextract-JSONL adapter for verbs/
   adjectives/function words) means pushing one more entry here — the
   pipeline (pipeline.js) never hard-codes a source name. */
const ADAPTERS = {
  [GermanNounsCsvAdapter.name]: GermanNounsCsvAdapter,
  [WiktextractJsonlAdapter.name]: WiktextractJsonlAdapter,
};

function getAdapter(name){
  const a = ADAPTERS[name];
  if(!a) throw new Error('Unknown source adapter "' + name + '". Known: ' + Object.keys(ADAPTERS).join(', '));
  return a;
}

module.exports = { parseCsv, GermanNounsCsvAdapter, WiktextractJsonlAdapter, ADAPTERS, getAdapter };

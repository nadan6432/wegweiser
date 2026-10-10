/* ============================================================
   DEDUPLICATION (Phase 6 spec §19)

   Master records already carry a deterministic ID (lemma + wordType),
   so "same lemma, same word type" collapses naturally by construction.
   This step's job is what happens WHEN two raw rows map to the same ID:
   fill in gaps from the second occurrence rather than either dropping
   data or blindly overwriting the first (spec §19: "compare normalized
   lemma, word type, sense, source ID" / "do not merge things that are
   actually distinct homonyms").

   This source (nouns-only, no sense data) cannot actually distinguish
   homonyms — that requires sense-level data a future source would add
   (spec §20/§21). Until then, a lemma+wordType collision is treated as
   the same lexical item, which is the correct, conservative default. */
'use strict';

function mergeCaseTable(a, b){
  if(!a) return b;
  if(!b) return a;
  const out = {};
  const cases = new Set([...Object.keys(a), ...Object.keys(b)]);
  cases.forEach(c => { out[c] = Object.assign({}, b[c], a[c]); }); // a (first-seen) wins per slot
  return out;
}

function dedupeMasterRecords(records){
  const byId = new Map();
  const stats = { input: records.length, uniqueLemmas: 0, duplicateRows: 0 };

  records.forEach(rec => {
    const existing = byId.get(rec.id);
    if(!existing){
      byId.set(rec.id, rec);
      return;
    }
    stats.duplicateRows++;
    // Fill gaps only — never let a later duplicate clobber a value the
    // first occurrence already had.
    if(!existing.article && rec.article) existing.article = rec.article;
    if(!existing.gender && rec.gender) existing.gender = rec.gender;
    if(!existing.plural && rec.plural) existing.plural = rec.plural;
    existing.forms = mergeCaseTable(existing.forms, rec.forms);
    existing.surfaceForms = Array.from(new Set([...(existing.surfaceForms||[]), ...(rec.surfaceForms||[])]));
    existing.sources = Array.from(new Set([...(existing.sources||[]), ...(rec.sources||[])]));
    // Same lemma+POS from another etymology/entry (homographs like Bank): keep
    // ALL distinct senses rather than dropping the later ones (Phase 7 §13/§20).
    const seen = new Set((existing.senses||[]).map(x => (x.glosses||[]).join('|')));
    (rec.senses||[]).forEach(x => { const k=(x.glosses||[]).join('|'); if(!seen.has(k)){ seen.add(k); existing.senses.push(x); } });
    existing.meanings = Array.from(new Set([...(existing.meanings||[]), ...(rec.meanings||[])]));
    existing.examples = (existing.examples||[]).concat((rec.examples||[]).filter(e => !(existing.examples||[]).some(o => o.de === e.de))).slice(0, 8);
    if(!existing.pronunciation && rec.pronunciation) existing.pronunciation = rec.pronunciation;
  });

  stats.uniqueLemmas = byId.size;
  return { records: Array.from(byId.values()), stats };
}

module.exports = { dedupeMasterRecords, mergeCaseTable };

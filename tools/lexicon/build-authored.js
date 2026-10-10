#!/usr/bin/env node
/* ============================================================
   AUTHORED LEXICON BUILD (Phase 8 — fallback when no bulk dataset)

   Reads hand-authored pipe-separated files in data/authored/*.psv, validates
   every line, derives forms by deterministic German rules ONLY where the rule
   is unambiguous, dedupes, checks against the curated Wegweiser vocabulary
   (curated always wins, never modified) and against the real-sourced base
   master (kaikki / german-nouns records win), and exports chunked static
   assets plus an audit report.

   File kinds (by filename prefix):
     nouns-*     Lemma|g(m/f/n/p)|plural(-=none)|English|cefr?|domain?
     verbs-*     lemma|praeteritum|partizip2|aux(h/s/h,s)|English|cefr?|flags?|pres3?
                 flags: s=separable r=reflexive i=irregular/strong m=modal
     adj-*       lemma|comp(+ auto | - none | inv | a,b explicit)|English|cefr?
     func-*      lemma|type|English|cefr?|note?   types: adv pron art det prep conj subj part mpart intj num
     phrases-*   phrase|English|cefr?
     idioms-*    idiom|literal|meaning|cefr?
     proper-*    Name|g(m/f/n/p/-)|English|cefr?
   Usage: node tools/lexicon/build-authored.js [--base=data/processed/master-lexicon.json] [--out=data/processed/master]
   ============================================================ */
'use strict';
const fs = require('fs'); const path = require('path');
const Schema = require('../../src/core/schema.js');
const { normalizeUnicode, dedupeKey, stripArticle } = require('./normalize.js');
const { buildMasterRecord, stableId } = require('./masterRecord.js');
const { exportChunked } = require('./streaming.js');
const { loadCuratedVocab } = require('./pipeline.js');

const ROOT = path.join(__dirname, '..', '..');
const CEFR = ['A0','A1','A2','B1','B2','C1','C2'];
const FUNC_TYPES = { adv:'adverb', pron:'pronoun', art:'article', det:'determiner', prep:'preposition', conj:'conjunction', subj:'subjunction', part:'particle', mpart:'modal_particle', intj:'interjection', num:'number' };
const SRC = 'wegweiser-authored';

/* ---------- rule-based forms (only where German morphology is regular) ---------- */
const needsE = (stem) => /[dt]$/.test(stem) || /[^lrmnhaeiouäöüy][mn]$/.test(stem) || /chn$/.test(stem);
function dativePlural(pl){ return /[ns]$/.test(pl) ? pl : pl + 'n'; }
function weakPresent(lemma){
  if(/eln$/.test(lemma)){ const b = lemma.slice(0, -3); return [b + 'le', b + 'elst', b + 'elt', lemma]; }   // sammeln -> sammle
  if(/ern$/.test(lemma)){ const b = lemma.slice(0, -1); return [b + 'e', b + 'st', b + 't', lemma]; }        // wandern -> wandere
  if(!/en$/.test(lemma)) return [];
  const st = lemma.slice(0, -2), e = needsE(st);
  const sib = /[sßxz]$/.test(st);
  return [st + 'e', st + (sib ? 't' : (e ? 'est' : 'st')), st + (e ? 'et' : 't'), lemma];
}
function praetForms(praet, weak){
  if(/ /.test(praet)) return [];               // separable: kept as written, no generation
  const sib = /[sßxz]$|sch$/.test(praet);
  const du = praet + ((!weak && sib) ? 'est' : 'st');
  return [praet, du, praet + (weak ? 'n' : 'en'), praet + 't'];
}
function compForms(lemma, spec){
  if(spec === '-' || spec === 'inv') return { forms: [] };
  let comp, sup;
  if(spec === '+'){
    if(/el$/.test(lemma)) comp = lemma.slice(0, -2) + 'ler'; else if(/e$/.test(lemma)) comp = lemma + 'r'; else comp = lemma + 'er';
    sup = lemma + (/[dtsßxz]$|sch$/.test(lemma) ? 'esten' : 'sten');
    sup = 'am ' + sup;
  } else { const p = spec.split(','); comp = p[0].trim(); sup = p[1] ? p[1].trim() : null; }
  const f = [comp]; if(sup) f.push(sup);
  return { comp, sup, forms: f };
}
function attrForms(lemma, spec){
  if(spec === 'inv' || lemma === 'hoch' || /(el|er|en|e)$/.test(lemma)) return [];
  return ['e', 'en', 'er', 'em', 'es'].map(x => lemma + x);
}

/* ---------- parsing ---------- */
function readLines(file){
  return fs.readFileSync(file, 'utf8').split('\n').map((l, i) => ({ l: l.replace(/\r$/, ''), n: i + 1 }))
    .filter(x => x.l.trim() && !x.l.trim().startsWith('#')).map(x => x.l.startsWith('@domain ') ? ({ dom: x.l.slice(8).trim(), n: x.n }) : ({ f: x.l.split('|').map(c => normalizeUnicode(c).trim()), n: x.n }));
}

function parseAll(dir){
  const out = []; const errors = [];
  fs.readdirSync(dir).filter(f => f.endsWith('.psv')).sort().forEach(file => {
    const kind = file.split('-')[0]; const rows = readLines(path.join(dir, file));
    let curDomain = null; const before = () => out.length;
    rows.forEach(({ f, n, dom }) => {
      if(dom !== undefined){ curDomain = dom; return; }
      const start = out.length;
      const at = file + ':' + n; const bad = (m) => errors.push({ at, line: f.join('|'), reason: m });
      const cefr = (c) => { const u = (c || '').toUpperCase(); return CEFR.includes(u) ? u : null; };
      try {
        if(kind === 'nouns'){
          const [lemma, g, plural, en, c, domain] = f;
          if(!lemma || !/^[A-ZÄÖÜ]/.test(lemma)) return bad('noun lemma must be capitalized');
          if(!['m','f','n','p'].includes(g)) return bad('noun gender must be m/f/n/p');
          if(!en) return bad('missing English gloss');
          if(c && !cefr(c)) return bad('invalid CEFR "' + c + '"');
          out.push({ at, type: 'noun', lemma, gender: g === 'p' ? null : g, plural: (plural && plural !== '-') ? plural : '', pluralOnly: g === 'p', en, cefr: cefr(c), domain: domain || null,
            forms: (plural && plural !== '-') ? [plural, dativePlural(plural)] : [] });
        } else if(kind === 'verbs'){
          let [lemma, praet, part, aux, en, c, flags = '', pres3] = f;
          if(!lemma || !/^[a-zäöüß]+$/.test(lemma) || !/(en|ln|rn)$|^(sein|tun)$/.test(lemma)) return bad('verb infinitive shape invalid');
          const sepMatch = flags.match(/s:([a-zäöüß]+)/); const prefix = sepMatch ? sepMatch[1] : '';
          if(praet === '~' && part === '~'){           // regular weak verb shorthand
            if(/i/.test(flags.replace(/s:[a-zäöüß]+/, ''))) return bad('~ shorthand is only for regular weak verbs');
            let base = lemma; if(prefix){ if(!lemma.startsWith(prefix)) return bad('separable prefix does not match lemma'); base = lemma.slice(prefix.length); }
            const st = base.replace(/(e?n)$/, ''); const e = needsE(st) ? 'e' : '';
            const noGe = flags.replace(/s:[a-zäöüß]+/, '').includes('p') || /ieren$/.test(base);
            const pr = st + e + 'te'; const pp = (noGe ? '' : 'ge') + st + e + 't';
            praet = prefix ? pr + ' ' + prefix : pr; part = prefix ? prefix + pp : pp;
          }
          if(!praet || !part) return bad('missing Präteritum or Partizip II');
          aux = (aux === 's,h') ? 'h,s' : aux;
          if(!['h','s','h,s'].includes(aux)) return bad('aux must be h, s or h,s');
          if(!en) return bad('missing English gloss');
          if(c && !cefr(c)) return bad('invalid CEFR "' + c + '"');
          const fl = flags.replace(/s:[a-zäöüß]+/, 'S'); const sep = fl.includes('S') || fl.includes('s'), irr = fl.includes('i') || fl.includes('m');
          const weak = !irr && /te$/.test(praet);
          let forms = [part, pres3].filter(Boolean);
          if(!sep){
            forms = forms.concat(praetForms(praet, /te$/.test(praet)));
            if(weak && !fl.includes('r')) forms = forms.concat(weakPresent(lemma));
            if(/n$/.test(lemma)) forms.push(lemma + 'd');
          } else forms.push(praet);
          out.push({ at, type: 'verb', lemma, praet, part, aux, en, cefr: cefr(c), separable: sep, reflexive: fl.includes('r'), irregular: irr, modal: fl.includes('m'), pres3: pres3 || null, forms });
        } else if(kind === 'adj'){
          const [lemma, comp, en, c] = f;
          if(!lemma || !/^[a-zäöüß-]+$/.test(lemma)) return bad('adjective lemma shape invalid');
          if(!comp) return bad('missing comparison spec (+, -, inv or a,b)');
          if(!en) return bad('missing English gloss');
          if(c && !cefr(c)) return bad('invalid CEFR "' + c + '"');
          const cf = compForms(lemma, comp);
          out.push({ at, type: 'adjective', lemma, en, cefr: cefr(c), comparative: cf.comp || null, superlative: cf.sup || null, forms: cf.forms.concat(attrForms(lemma, comp)) });
        } else if(kind === 'func'){
          const [lemma, t, en, c, note] = f;
          if(!FUNC_TYPES[t]) return bad('unknown function-word type "' + t + '"');
          if(!lemma || !en) return bad('missing lemma or English gloss');
          if(c && !cefr(c)) return bad('invalid CEFR "' + c + '"');
          out.push({ at, type: FUNC_TYPES[t], lemma, en, cefr: cefr(c), note: note || null, forms: [] });
        } else if(kind === 'phrases'){
          const [lemma, en, c] = f;
          if(!lemma || !en) return bad('missing phrase or English gloss');
          if(c && !cefr(c)) return bad('invalid CEFR "' + c + '"');
          out.push({ at, type: 'phrase', lemma, en, cefr: cefr(c), forms: [] });
        } else if(kind === 'idioms'){
          const [lemma, literal, en, c] = f;
          if(!lemma || !literal || !en) return bad('idiom needs German|literal|meaning');
          if(c && !cefr(c)) return bad('invalid CEFR "' + c + '"');
          out.push({ at, type: 'idiom', lemma, en, literal, cefr: cefr(c), forms: [] });
        } else if(kind === 'proper'){
          const [lemma, g, en, c] = f;
          if(!lemma || !/^[A-ZÄÖÜ]/.test(lemma)) return bad('proper noun must be capitalized');
          if(!['m','f','n','p','-'].includes(g)) return bad('gender must be m/f/n/p/-');
          if(!en) return bad('missing English gloss');
          out.push({ at, type: 'proper_noun', lemma, gender: ['m','f','n'].includes(g) ? g : null, pluralOnly: g === 'p', en, cefr: cefr(c), forms: [] });
        } else bad('unknown file kind "' + kind + '"');
      } catch(e){ bad('exception: ' + e.message); }
      for(let i = start; i < out.length; i++) if(!out[i].domain && curDomain) out[i].domain = curDomain;
    });
  });
  return { items: out, errors };
}

/* ---------- curated family matching (curated data always wins) ---------- */
const FAMILY = { noun:'noun', verb:'verb', adjective:'adj', adverb:'adv', phrase:'phrase', idiom:'phrase', proper_noun:'noun' };
const fam = (t) => FAMILY[t] || 'func';
function curatedIndex(vocab){
  const m = new Map();
  vocab.forEach(v => { const k = stripArticle(v.lemma || v.de || '').toLowerCase(); if(!k) return; (m.get(k) || m.set(k, []).get(k)).push(fam(Schema.canonicalWordType(v.type))); });
  return m;
}

function toRecord(it){
  const raw = { lemma: it.lemma, gender: it.gender || null, forms: it.plural ? { plural: it.plural } : {}, sourceName: SRC, sourceId: it.at,
    sourceWordType: it.type, senses: [{ glosses: [it.en], tags: [] }], allForms: it.forms || [] };
  const rec = buildMasterRecord({ raw, classification: { status: 'VALID', reasons: [], wordType: it.type }, sourceLabel: 'Wegweiser authored lexicon', importDate: new Date().toISOString().slice(0, 10) });
  rec.wordType = it.type;
  if(it.pluralOnly){ rec.article = 'die'; rec.plural = ''; }
  if(it.type === 'idiom'){ rec.meanings = [it.en]; rec.senses = [{ glosses: [it.en], tags: ['idiom'], literal: it.literal }]; }
  rec.translations = { en: [it.en], ur: [], ps: [] };
  rec.morphology = {};
  if(it.type === 'verb') rec.morphology = { praeteritum: it.praet, partizip2: it.part, auxiliary: it.aux, separable: it.separable, reflexive: it.reflexive, irregular: it.irregular, modal: it.modal, present3sg: it.pres3 };
  if(it.type === 'adjective') rec.morphology = { comparative: it.comparative, superlative: it.superlative };
  if(it.type === 'noun') rec.morphology = { pluralOnly: it.pluralOnly || false };
  if(it.note) rec.morphology.note = it.note;
  rec.domain = it.domain || null;
  rec.cefr = it.cefr || 'unknown';
  rec.cefrBasis = it.cefr ? 'authored-estimate' : null; // NOT an official CEFR list — see PHASE8 report
  rec.sources = [SRC];
  rec.provenance.sourceName = SRC;
  return rec;
}

function build({ authoredDir, basePath, outDir, log = console.error }){
  const { items, errors } = parseAll(authoredDir);
  const curated = loadCuratedVocab(ROOT); const cidx = curatedIndex(curated);
  let base = []; if(basePath && fs.existsSync(basePath)) base = JSON.parse(fs.readFileSync(basePath, 'utf8')).masterLexicon || [];
  const baseIds = new Map(base.map(r => [r.id, r]));
  const seen = new Map(); const added = []; const stats = { authoredLines: items.length + errors.length, invalid: errors.length, duplicatesInAuthored: 0, duplicateOfSourcedBase: 0, matchedCurated: 0, homographDifferentType: 0 };
  const dupList = [];
  items.forEach(it => {
    const rec = toRecord(it);
    if(seen.has(rec.id)){ stats.duplicatesInAuthored++; dupList.push({ at: it.at, id: rec.id, first: seen.get(rec.id) }); return; }
    seen.set(rec.id, it.at);
    const cf = cidx.get(it.lemma.toLowerCase());
    if(cf && cf.includes(fam(it.type))){ stats.matchedCurated++; return; }          // curated wins, untouched
    if(cf) stats.homographDifferentType++;
    if(baseIds.has(rec.id)){ stats.duplicateOfSourcedBase++; const b = baseIds.get(rec.id); b.sources = Array.from(new Set([...(b.sources || []), SRC])); return; }
    added.push(rec);
  });
  const all = base.concat(added);
  const chunks = exportChunked(all, outDir, { source: 'base(sourced)+wegweiser-authored', pipelineVersion: 'phase8-1', importDate: new Date().toISOString().slice(0, 10) });
  return { all, added, stats, errors, dupList, chunks, curatedCount: curated.length };
}

function report(all, added, extra){
  const by = {}, cefr = { A0:0,A1:0,A2:0,B1:0,B2:0,C1:0,C2:0,unknown:0 };
  let forms = 0, gloss = 0, gender = 0, plural = 0, verbsConj = 0, adjComp = 0, ipa = 0, ex = 0, multi = 0, ur = 0, ps = 0;
  all.forEach(r => { by[r.wordType] = (by[r.wordType] || 0) + 1; cefr[r.cefr || 'unknown'] = (cefr[r.cefr || 'unknown'] || 0) + 1; forms += (r.surfaceForms || []).length;
    if((r.meanings || []).length) gloss++; if(r.wordType === 'noun' && r.gender) gender++; if(r.wordType === 'noun' && r.plural) plural++;
    if(r.wordType === 'verb' && r.morphology && r.morphology.partizip2) verbsConj++; if(r.wordType === 'adjective' && r.morphology && r.morphology.comparative) adjComp++;
    if(r.pronunciation) ipa++; if((r.examples || []).length) ex++; if((r.senses || []).length > 1) multi++;
    if(r.translations && (r.translations.ur || []).length) ur++; if(r.translations && (r.translations.ps || []).length) ps++; });
  return Object.assign({ totalLemmas: all.length, newAuthoredRecords: added.length, surfaceForms: forms, byWordType: by, cefr, englishGloss: gloss, urdu: ur, pashto: ps, nounsWithGender: gender, nounsWithPlural: plural, verbsWithPrincipalParts: verbsConj, adjectivesWithComparison: adjComp, withIpa: ipa, withExamples: ex, multiSense: multi }, extra || {});
}

module.exports = { parseAll, build, report, compForms, attrForms, weakPresent, dativePlural };

if(require.main === module){
  const args = {}; process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)=(.*)$/); if(m) args[m[1]] = m[2]; });
  const r = build({ authoredDir: path.join(ROOT, 'data/authored'), basePath: args.base || path.join(ROOT, 'data/processed/master-lexicon.json'), outDir: args.out || path.join(ROOT, 'data/processed/master') });
  const rep = report(r.all, r.added, { buildStats: r.stats, curatedExisting: r.curatedCount });
  fs.mkdirSync(path.join(ROOT, 'data/exports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data/exports/phase8-audit-report.json'), JSON.stringify(rep, null, 2));
  fs.writeFileSync(path.join(ROOT, 'data/exports/phase8-rejected.json'), JSON.stringify({ invalid: r.errors, duplicates: r.dupList }, null, 2));
  console.log(JSON.stringify(rep, null, 2));
  if(r.errors.length) console.error('INVALID LINES: ' + r.errors.length + ' (see data/exports/phase8-rejected.json)');
}

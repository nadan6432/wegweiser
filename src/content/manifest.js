/* ============================================================
   MANIFEST (spec §46: offline content packs + manifest)
   Declares what content packs exist, their dependencies, and
   summary counts. The registry uses this to load packs in the
   right order and to power the in-app "what's installed" view.
   Counts are computed once by build_manifest() so they can
   never silently drift from the real content.
   ============================================================ */
const Manifest = (() => {
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');

  const PACK_DEFS = [
    { id:'core', title:'Core Engine & A0 Foundation', levels:['A0'], dependsOn:[] },
    { id:'a1', title:'A1 — Breakthrough', levels:['A1'], dependsOn:['core'] },
    { id:'a2', title:'A2 — Waystage', levels:['A2'], dependsOn:['a1'] },
    { id:'b1', title:'B1 — Threshold', levels:['B1'], dependsOn:['a2'] },
    { id:'b2', title:'B2 — Vantage', levels:['B2'], dependsOn:['b1'] },
    { id:'c1', title:'C1 — Effective Operational Proficiency', levels:['C1'], dependsOn:['b2'] },
    { id:'c2', title:'C2 — Mastery', levels:['C2'], dependsOn:['c1'] },
    { id:'exam', title:'Exam Preparation (Goethe/telc/ÖSD-style, original content)', levels:['A1','A2','B1','B2','C1','C2'], dependsOn:['a1'] },
  ];

  function build(counts){
    return {
      schemaVersion: S.SCHEMA_VERSION,
      contentVersion: S.CONTENT_VERSION,
      generatedAt: new Date().toISOString(),
      packs: PACK_DEFS,
      counts,
    };
  }

  return { PACK_DEFS, build };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = Manifest; }

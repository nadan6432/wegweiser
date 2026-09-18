/* ============================================================
   CONTENT VALIDATOR (spec: lightweight content validator —
   no duplicate IDs, no broken refs)
   Runs against the MERGED content graph (after Registry.build())
   so it validates exactly what the app will actually load, not
   just the newly-authored packs in isolation.
   ============================================================ */
const ContentValidator = (() => {

  function validate(merged){
    const errors = [], warnings = [];

    const vocabIds = new Set(merged.VOCAB.map(v=>v.id));
    const grammarIds = new Set(merged.GRAMMAR.map(g=>g.id));
    const lessonIds = new Set(merged.LESSONS.map(l=>l.id));
    const unitIds = new Set(merged.UNITS.map(u=>u.id));

    /* duplicate ids within each collection */
    function checkDup(list, label){
      const seen = new Map();
      list.forEach(x=>seen.set(x.id, (seen.get(x.id)||0)+1));
      seen.forEach((count,id)=>{ if(count>1) errors.push(`Duplicate ${label} id: ${id} (${count}x)`); });
    }
    checkDup(merged.VOCAB, 'vocab');
    checkDup(merged.GRAMMAR, 'grammar');
    checkDup(merged.LESSONS, 'lesson');
    checkDup(merged.UNITS, 'unit');

    /* lesson -> vocab / grammar / prereq / unit refs */
    merged.LESSONS.forEach(l=>{
      (l.vocabIds||[]).forEach(id=>{ if(!vocabIds.has(id)) errors.push(`Lesson ${l.id} references missing vocab id ${id}`); });
      (l.grammarIds||[]).forEach(id=>{ if(!grammarIds.has(id)) errors.push(`Lesson ${l.id} references missing grammar id ${id}`); });
      (l.prereq||[]).forEach(id=>{ if(!lessonIds.has(id)) warnings.push(`Lesson ${l.id} has prereq ${id} not found in merged lesson set`); });
      if(l.unitId && !unitIds.has(l.unitId)) warnings.push(`Lesson ${l.id} references unit ${l.unitId} not found in merged unit set`);
    });

    /* unit -> lesson refs */
    merged.UNITS.forEach(u=>{
      (u.lessonIds||[]).forEach(id=>{ if(!lessonIds.has(id)) errors.push(`Unit ${u.id} references missing lesson id ${id}`); });
    });

    /* grammar prereq graph: no self-reference, no reference to missing id */
    merged.GRAMMAR.forEach(g=>{
      (g.prereq||[]).forEach(id=>{
        if(id===g.id) errors.push(`Grammar ${g.id} lists itself as its own prerequisite`);
        else if(!grammarIds.has(id)) warnings.push(`Grammar ${g.id} has prereq ${id} not found in merged grammar set`);
      });
    });

    /* exercise structural checks */
    let exerciseCount = 0;
    const exIds = new Set();
    merged.LESSONS.forEach(l=>(l.exercises||[]).forEach(ex=>{
      exerciseCount++;
      if(exIds.has(ex.id)) errors.push(`Duplicate exercise id: ${ex.id}`);
      exIds.add(ex.id);
      if(ex.type==='mcq' && (!ex.options || !ex.options.includes(ex.correct))) errors.push(`mcq exercise ${ex.id} correct answer not in options`);
      if(ex.type==='build' && ex.correctOrder && ex.words && ex.words.length!==ex.correctOrder.length) errors.push(`build exercise ${ex.id} words/correctOrder length mismatch`);
      if(ex.type==='build' && ex.correctOrder && JSON.stringify(ex.words)===JSON.stringify(ex.correctOrder) && ex.words.length>1) warnings.push(`build exercise ${ex.id} words array equals correctOrder (answer may be visible)`);
    }));

    /* vocab structural checks */
    merged.VOCAB.forEach(v=>{
      if(!v.de) errors.push(`Vocab ${v.id} has empty 'de' field`);
      if(v.type==='noun' && !v.article) warnings.push(`Vocab ${v.id} is a noun with no article`);
    });

    return {
      ok: errors.length===0,
      errors, warnings,
      counts: { vocab:merged.VOCAB.length, grammar:merged.GRAMMAR.length, lessons:merged.LESSONS.length,
        units:merged.UNITS.length, exercises:exerciseCount },
    };
  }

  return { validate };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = ContentValidator; }

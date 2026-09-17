/* ============================================================
   SRS — Spaced Repetition Scheduler
   A simplified, transparent implementation of the SM-2 algorithm
   (the same family of algorithm behind Anki/SuperMemo), used
   because it's a well-understood and proven approach rather than
   a reinvented ad-hoc scheme.

   Item shape (stored in DB.vocabProgress):
   { id: vocabId, status, ef, interval, reps, lapses, due, lastSeen }
   status: 'new' | 'learning' | 'familiar' | 'mastered' | 'forgotten'
   ============================================================ */
const SRS = (() => {
  const DAY_MS = 24*60*60*1000;

  function freshItem(vocabId){
    return {
      id: vocabId, status:'new', ef:2.5, interval:0, reps:0, lapses:0,
      due: Date.now(), lastSeen: null,
    };
  }

  /* quality: 0-5 (0/1 = fail/very hard, 2 = hard-but-correct, 3 = correct with hesitation,
     4 = correct, 5 = easy). We derive quality from correctness + attempt count in app.js. */
  function schedule(item, quality){
    const it = { ...item };
    it.lastSeen = Date.now();

    if(quality < 3){
      // Failure: reset repetitions, keep the item in the "learning" bucket, review again soon.
      it.reps = 0;
      it.lapses += 1;
      it.interval = 0;
      it.status = it.lapses >= 2 ? 'forgotten' : 'learning';
      it.due = Date.now() + (10*60*1000); // review again in 10 minutes (same-session)
      it.ef = Math.max(1.3, it.ef - 0.2);
      return it;
    }

    // Success
    it.ef = Math.max(1.3, it.ef + (0.1 - (5-quality)*(0.08+(5-quality)*0.02)));
    it.reps += 1;

    if(it.reps === 1){ it.interval = 1; }
    else if(it.reps === 2){ it.interval = 6; }
    else { it.interval = Math.round(it.interval * it.ef); }

    it.due = Date.now() + it.interval*DAY_MS;

    if(it.reps <= 1) it.status = 'learning';
    else if(it.interval < 21) it.status = 'familiar';
    else it.status = 'mastered';

    return it;
  }

  function isDue(item){ return item.due <= Date.now(); }

  return { freshItem, schedule, isDue, DAY_MS };
})();

/* ============================================================
   DB — offline-first persistence layer.
   Three-tier fallback so the app never hard-fails on storage:
     1. IndexedDB (preferred)
     2. localStorage (if IndexedDB is unavailable/blocked)
     3. in-memory only (if even localStorage throws — e.g. some
        locked-down embedded/private-browsing contexts). Progress
        won't survive a reload in this mode, but the app still runs
        for the current session instead of crashing at boot.
   Stores: profile, vocabProgress, lessonProgress, mistakes, sessions, attempts
   ============================================================ */
const DB = (() => {
  const DB_NAME = 'wegweiser_db';
  /* v2: adds stores for the new learning engine (skill/unit progress,
     assessment results, and a local-only learner-context cache) without
     touching any existing store — IndexedDB's onupgradeneeded only CREATES
     missing object stores here, so every existing store and its data
     (profile, vocabProgress, lessonProgress, mistakes, sessions, attempts,
     feedback, readingProgress, writingSubmissions) is preserved untouched. */
  const DB_VERSION = 2;
  const STORES = ['profile','vocabProgress','lessonProgress','mistakes','sessions','attempts','feedback','readingProgress','writingSubmissions',
    'skillProgress','unitProgress','assessmentResults','learnerContext'];
  let idb = null;
  let mode = 'pending'; // 'indexeddb' | 'localstorage' | 'memory'
  const memStore = {}; // store -> {id: obj}
  STORES.forEach(s=>memStore[s]={});

  function openIDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){ reject(new Error('no-indexeddb')); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        STORES.forEach(name=>{
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name, {keyPath:'id'});
          }
        });
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject((e.target && e.target.error) || new Error('idb-open-failed'));
      req.onblocked = () => reject(new Error('idb-blocked'));
    });
  }

  /* JSON.parse that self-heals instead of throwing on corrupted
     localStorage content (requirement: survive corrupted local data). */
  function safeParseObj(str){
    if(!str) return {};
    try{
      const v = JSON.parse(str);
      return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    }catch(err){
      console.warn('DB: corrupted local data detected, resetting this store.', err.message);
      return {};
    }
  }

  async function init(){
    try{
      idb = await openIDB();
      mode = 'indexeddb';
      return mode;
    }catch(err){
      console.warn('IndexedDB unavailable, falling back to localStorage:', err.message);
    }
    try{
      STORES.forEach(s=>{
        const key = 'wg_'+s;
        const existing = localStorage.getItem(key);
        if(existing===null){ localStorage.setItem(key, JSON.stringify({})); }
        else { safeParseObj(existing); } // touch it once so corruption is caught at boot, not mid-session
      });
      mode = 'localstorage';
    }catch(err){
      console.warn('localStorage unavailable either, falling back to in-memory only (progress will not survive a reload):', err.message);
      mode = 'memory';
    }
    return mode;
  }

  function lsGetAll(store){ return Object.values(safeParseObj(localStorage.getItem('wg_'+store))); }
  function lsGet(store, id){ return safeParseObj(localStorage.getItem('wg_'+store))[id] || null; }
  function lsWriteWhole(store, all){
    try{
      localStorage.setItem('wg_'+store, JSON.stringify(all));
      return true;
    }catch(err){
      // Quota exceeded or storage revoked mid-session: keep going in memory
      // for this run rather than throwing and breaking the current action.
      console.warn('DB: localStorage write failed, mirroring to memory for this session:', err.message);
      memStore[store] = all;
      return false;
    }
  }
  function lsPut(store, obj){
    const all = safeParseObj(localStorage.getItem('wg_'+store));
    all[obj.id] = obj;
    lsWriteWhole(store, all);
    return obj;
  }
  function lsDelete(store, id){
    const all = safeParseObj(localStorage.getItem('wg_'+store));
    delete all[id];
    lsWriteWhole(store, all);
  }
  function lsClear(store){ lsWriteWhole(store, {}); }

  function memGetAll(store){ return Object.values(memStore[store]||{}); }
  function memGet(store,id){ return (memStore[store]||{})[id] || null; }
  function memPut(store,obj){ memStore[store]=memStore[store]||{}; memStore[store][obj.id]=obj; return obj; }
  function memDelete(store,id){ if(memStore[store]) delete memStore[store][id]; }
  function memClear(store){ memStore[store]={}; }

  function put(store, obj){
    if(mode==='memory') return Promise.resolve(memPut(store,obj));
    if(mode==='localstorage') return Promise.resolve(lsPut(store,obj));
    return new Promise((resolve,reject)=>{
      try{
        const tx = idb.transaction(store,'readwrite');
        tx.objectStore(store).put(obj);
        tx.oncomplete = ()=>resolve(obj);
        tx.onerror = ()=>reject(tx.error);
      }catch(err){ reject(err); }
    });
  }
  function get(store, id){
    if(mode==='memory') return Promise.resolve(memGet(store,id));
    if(mode==='localstorage') return Promise.resolve(lsGet(store,id));
    return new Promise((resolve,reject)=>{
      try{
        const tx = idb.transaction(store,'readonly');
        const req = tx.objectStore(store).get(id);
        req.onsuccess = ()=>resolve(req.result || null);
        req.onerror = ()=>reject(req.error);
      }catch(err){ reject(err); }
    });
  }
  function getAll(store){
    if(mode==='memory') return Promise.resolve(memGetAll(store));
    if(mode==='localstorage') return Promise.resolve(lsGetAll(store));
    return new Promise((resolve,reject)=>{
      try{
        const tx = idb.transaction(store,'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = ()=>resolve(req.result || []);
        req.onerror = ()=>reject(req.error);
      }catch(err){ reject(err); }
    });
  }
  function remove(store, id){
    if(mode==='memory'){ memDelete(store,id); return Promise.resolve(); }
    if(mode==='localstorage'){ lsDelete(store,id); return Promise.resolve(); }
    return new Promise((resolve,reject)=>{
      try{
        const tx = idb.transaction(store,'readwrite');
        tx.objectStore(store).delete(id);
        tx.oncomplete = ()=>resolve();
        tx.onerror = ()=>reject(tx.error);
      }catch(err){ reject(err); }
    });
  }
  function clearStore(store){
    if(mode==='memory'){ memClear(store); return Promise.resolve(); }
    if(mode==='localstorage'){ lsClear(store); return Promise.resolve(); }
    return new Promise((resolve,reject)=>{
      try{
        const tx = idb.transaction(store,'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = ()=>resolve();
        tx.onerror = ()=>reject(tx.error);
      }catch(err){ reject(err); }
    });
  }

  async function exportAll(){
    const out = {};
    for(const s of STORES){ out[s] = await getAll(s); }
    out._exportedAt = new Date().toISOString();
    out._version = DB_VERSION;
    out._app = 'wegweiser';
    return out;
  }

  /* Structural validation only — no writes happen here. Called
     before importAll so a malformed/foreign JSON file can never
     wipe existing data (see app.js importData). */
  function validateImportShape(data){
    if(!data || typeof data !== 'object' || Array.isArray(data)){
      return 'File is not a valid Wegweiser export (expected a JSON object).';
    }
    const hasAnyStore = STORES.some(s => Array.isArray(data[s]));
    if(!hasAnyStore){
      return 'File does not contain any recognizable Wegweiser data (no profile/vocabProgress/lessonProgress/mistakes/sessions/attempts arrays found).';
    }
    for(const s of STORES){
      if(data[s]!==undefined && !Array.isArray(data[s])){
        return `Field "${s}" should be a list but isn\u2019t — file looks corrupted.`;
      }
      if(Array.isArray(data[s])){
        for(const item of data[s]){
          if(!item || typeof item !== 'object' || typeof item.id !== 'string'){
            return `An entry in "${s}" is missing a valid id — file looks corrupted.`;
          }
        }
      }
    }
    return null; // valid
  }

  async function importAll(data){
    const err = validateImportShape(data);
    if(err) throw new Error(err);
    for(const s of STORES){
      await clearStore(s);
      const items = data[s] || [];
      for(const item of items){ await put(s, item); }
    }
  }
  async function resetAll(){
    for(const s of STORES){ await clearStore(s); }
  }

  return { init, put, get, getAll, remove, clearStore, exportAll, importAll, resetAll,
           validateImportShape, get mode(){ return mode; }, STORES };
})();

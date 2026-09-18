/* ============================================================
   ASSESSMENTS (spec §37-40)
   Level, unit, and skill assessments built from the exercises
   already authored in the curriculum (no separate content
   needed there — the assessment engine assembles a set from
   the lesson pool). Exam-style tasks are ORIGINAL content
   modelled on the known structure of Goethe/telc/ÖSD exams —
   never copied text, never a claim of official certification.
   ============================================================ */
const ASSESSMENTS = (() => {
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');

  /* Exam frameworks describe STRUCTURE only (section names, timing,
     skills tested) — this is public knowledge about exam format, not
     copyrighted exam content. No claim of official affiliation. */
  const EXAM_FRAMEWORKS = [
    { id:'goethe', name:'Goethe-Zertifikat', disclaimer:'Wegweiser is not affiliated with the Goethe-Institut. This models the publicly known exam structure with original practice material only.',
      levels:['A1','A2','B1','B2','C1','C2'],
      sections:{ A1:['Hören','Lesen','Schreiben','Sprechen'], A2:['Hören','Lesen','Schreiben','Sprechen'],
        B1:['Hören','Lesen','Schreiben','Sprechen'], B2:['Hören','Lesen','Schreiben','Sprechen'],
        C1:['Hören','Lesen','Schreiben','Sprechen'], C2:['Hören','Lesen','Schreiben','Sprechen'] } },
    { id:'telc', name:'telc Deutsch', disclaimer:'Wegweiser is not affiliated with telc GmbH. This models the publicly known exam structure with original practice material only.',
      levels:['A1','A2','B1','B2','C1'], sections:{ default:['Hören','Lesen','Schreiben','Sprechen'] } },
    { id:'oesd', name:'ÖSD Zertifikat', disclaimer:'Wegweiser is not affiliated with the ÖSD. This models the publicly known exam structure with original practice material only.',
      levels:['A1','A2','B1','B2','C1','C2'], sections:{ default:['Hören','Lesen','Schreiben','Sprechen'] } },
  ];

  /* Original exam-style tasks: same TASK TYPE as the real exams (e.g.
     "Lesen Teil 1: Kurznachrichten und Anzeigen zuordnen"), entirely
     original text and questions. */
  function mk(id, level, framework, section, part, title, task){
    return Object.assign({ id: S.ID_PREFIX.examTask+id, level, framework, section, part, title }, task, { meta: S.meta() });
  }

  const EXAM_TASKS = [
  mk('goethe_a1_lesen1','A1','goethe','Lesen','Teil 1','Anzeigen zuordnen', {
    instructions:'Lies die vier kurzen Anzeigen und die drei Aussagen. Welche Anzeige passt zu welcher Aussage?',
    items:[
      {text:'2-Zimmer-Wohnung, 45m², Miete 550€ warm, ab sofort frei.', tag:'ad1'},
      {text:'Deutschkurs A1-A2, montags und mittwochs 18-20 Uhr, Anmeldung erforderlich.', tag:'ad2'},
      {text:'Suche Person für Gartenarbeit, 2x pro Woche, gute Bezahlung.', tag:'ad3'},
      {text:'Verkaufe Fahrrad, gebraucht, guter Zustand, 80€.', tag:'ad4'},
    ],
    statements:[
      {text:'Jemand sucht eine günstige Wohnung.', correctTag:'ad1'},
      {text:'Jemand möchte Deutsch lernen.', correctTag:'ad2'},
      {text:'Jemand möchte ein Fahrrad kaufen.', correctTag:'ad4'},
    ],
  }),
  mk('goethe_a1_schreiben1','A1','goethe','Schreiben','Teil 1','Formular ausfüllen', {
    instructions:'Fülle das Anmeldeformular mit deinen eigenen Daten aus.',
    fields:['Vorname','Nachname','Geburtsdatum','Adresse','Telefonnummer'],
  }),
  mk('telc_a2_hoeren1','A2','telc','Hören','Teil 1','Ansagen verstehen', {
    instructions:'Lies die Durchsage und beantworte die Fragen.',
    transcript:'Achtung, liebe Fahrgäste: Der Bus Linie 12 fällt heute wegen einer Baustelle aus. Bitte nutzen Sie die Linie 14 als Ersatz.',
    questions:[
      {q:'Welche Buslinie fällt aus?', type:'fill', accept:['12','linie 12']},
      {q:'Welche Linie soll man stattdessen nehmen?', type:'fill', accept:['14','linie 14']},
    ],
  }),
  mk('goethe_b1_schreiben1','B1','goethe','Schreiben','Teil 1','Eine Nachricht schreiben', {
    instructions:'Du kannst zu einem Treffen mit Freunden nicht kommen. Schreib eine Nachricht (ca. 40-50 Wörter): Sag, dass du nicht kommen kannst, nenne einen Grund, und schlage einen anderen Termin vor.',
    minWords:40, maxWords:60,
  }),
  mk('goethe_b1_sprechen1','B1','goethe','Sprechen','Teil 2','Über ein Thema sprechen', {
    instructions:'Sprich 1-2 Minuten über folgendes Thema: "Ist es besser, in der Stadt oder auf dem Land zu leben?" Nenne Vor- und Nachteile und deine eigene Meinung.',
    prepTimeSeconds:60, speakTimeSeconds:120,
  }),
  mk('telc_b2_lesen1','B2','telc','Lesen','Teil 2','Hauptaussagen erkennen', {
    instructions:'Lies den Text und wähle die Aussage, die die Hauptidee am besten zusammenfasst.',
    text:'Immer mehr Unternehmen führen die Vier-Tage-Woche ein. Befürworter sehen darin eine Chance für höhere Produktivität und Mitarbeiterzufriedenheit, während Kritiker befürchten, dass die gleiche Arbeitsmenge in weniger Zeit zu mehr Stress führt.',
    options:['Die Vier-Tage-Woche wird von allen befürwortet.','Die Vier-Tage-Woche hat sowohl Befürworter als auch Kritiker mit unterschiedlichen Argumenten.','Die Vier-Tage-Woche ist gesetzlich verboten.','Niemand diskutiert über die Vier-Tage-Woche.'],
    correct:'Die Vier-Tage-Woche hat sowohl Befürworter als auch Kritiker mit unterschiedlichen Argumenten.',
  }),
  mk('goethe_c1_schreiben1','C1','goethe','Schreiben','Teil 1','Einen Kommentar verfassen', {
    instructions:'Verfasse einen Kommentar (ca. 200-250 Wörter) zu einem gesellschaftlich relevanten Thema deiner Wahl. Strukturiere deine Argumentation klar und beziehe mindestens ein Gegenargument ein.',
    minWords:200, maxWords:260,
  }),
  ];

  /* Placement test: broad diagnostic across levels, used to estimate a
     starting level before the learner begins the curriculum. */
  const PLACEMENT_TEST = {
    id:'placement_main', title:'Einstufungstest', description:'A broad diagnostic across A1-B2 grammar and vocabulary, used to estimate a starting level. Not a certified placement.',
    sections:[
      { level:'A1', questions:[
        {q:'Ich ___ Sara.', options:['heiße','heißt','heißen','bin'], correct:'heiße'},
        {q:'___ kommst du?', options:['Wo','Woher','Wohin','Wann'], correct:'Woher'},
        {q:'Ich habe ___ Bruder.', options:['ein','einen','eine','einem'], correct:'einen'},
      ]},
      { level:'A2', questions:[
        {q:'Ich ___ gestern ins Kino gegangen.', options:['habe','bin','war','hatte'], correct:'bin'},
        {q:'Ich helfe ___ Kollegen.', options:['der','den','dem','des'], correct:'dem'},
        {q:'___ ich klein war, wohnte ich in Aleppo.', options:['Wenn','Als','Wann','Ob'], correct:'Als'},
      ]},
      { level:'B1', questions:[
        {q:'Das ist der Mann, ___ ich gesehen habe.', options:['der','den','dem','dessen'], correct:'den'},
        {q:'Der Antrag ___ geprüft.', options:['wird','ist','hat','war'], correct:'wird'},
        {q:'___ Sie mir kurz helfen?', options:['Können','Könnten','Konnten','Werden'], correct:'Könnten'},
      ]},
      { level:'B2', questions:[
        {q:'Je mehr man übt, ___ besser wird man.', options:['dann','desto','also','damit'], correct:'desto'},
        {q:'Das Problem ___ sich lösen.', options:['lässt','kann','muss','soll'], correct:'lässt'},
        {q:'Er ___ krank sein, er sieht blass aus.', options:['muss','soll','will','darf'], correct:'muss'},
      ]},
    ],
    meta: S.meta(),
  };

  /* Level / Unit / Skill assessment TEMPLATES — the assessment SERVICE
     (src/services/assessment.js) fills these by sampling exercises from
     the relevant lessons at runtime, rather than duplicating content here. */
  const ASSESSMENT_TEMPLATES = {
    unit: { itemCount:8, passThreshold:0.7, sampling:'exercises from all lessons in the unit, at least one per lesson' },
    level: { itemCount:20, passThreshold:0.7, sampling:'exercises across all units of the level, weighted toward weak skills' },
    skill: { itemCount:10, passThreshold:0.7, sampling:'exercises tagged with the target skill, mixed levels around the learner\u2019s current level' },
    diagnostic: { itemCount:12, passThreshold:null, sampling:'placement-test style, cross-level, to locate the learner\u2019s starting point' },
  };

  return { EXAM_FRAMEWORKS, EXAM_TASKS, PLACEMENT_TEST, ASSESSMENT_TEMPLATES };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = ASSESSMENTS; }

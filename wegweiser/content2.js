/* ============================================================
   CONTENT2 — additional local content for the Phase-1 frontend
   expansion (Reading, Listening, Writing, Conversation, Exam
   Prep, Challenges, Achievements). Same rule as data.js: every
   line of German here is written and checked by hand, not
   generated — genders, cases, and word order are deliberate.
   ============================================================ */

/* ---------------- READING LAB ---------------- */
const READING_TEXTS = [
{
  id:'r01', level:'A1', title:'Meine Familie', topic:'family',
  text:`Ich heiße Amina. Ich komme aus Kabul und wohne jetzt in Berlin. Meine Familie ist nicht groß. Ich habe einen Bruder und eine Schwester. Mein Bruder heißt Karim. Er ist zwanzig Jahre alt und arbeitet in einem Supermarkt. Meine Schwester heißt Lina. Sie ist siebzehn Jahre alt und geht noch zur Schule. Meine Mutter kocht sehr gern. Mein Vater arbeitet als Lehrer. Am Wochenende essen wir immer zusammen.`,
  questions:[
    {id:'r01q1', prompt:'Woher kommt Amina?', options:['Berlin','Kabul','München','Wien'], correct:'Kabul'},
    {id:'r01q2', prompt:'Wie alt ist Karim?', options:['17','20','25','30'], correct:'20'},
    {id:'r01q3', prompt:'Was macht Aminas Vater beruflich?', options:['Arzt','Lehrer','Verkäufer','Student'], correct:'Lehrer'},
  ],
},
{
  id:'r02', level:'A1', title:'Ein Tag im Supermarkt', topic:'food',
  text:`Heute gehe ich in den Supermarkt. Ich brauche Brot, Käse und Äpfel. Das Brot kostet zwei Euro. Der Käse ist ein bisschen teuer, aber sehr gut. Ich kaufe auch Wasser und Kaffee. An der Kasse bezahle ich mit Karte. Die Verkäuferin sagt: "Auf Wiedersehen, einen schönen Tag noch!" Ich sage: "Danke, ebenfalls!"`,
  questions:[
    {id:'r02q1', prompt:'Was kostet zwei Euro?', options:['der Käse','das Brot','der Kaffee','das Wasser'], correct:'das Brot'},
    {id:'r02q2', prompt:'Wie bezahlt die Person?', options:['bar','mit Karte','mit Handy','gar nicht'], correct:'mit Karte'},
  ],
},
{
  id:'r03', level:'A2', title:'Ein Brief an einen Freund', topic:'daily-life',
  text:`Lieber Tom, wie geht es dir? Mir geht es gut. Ich wohne jetzt seit drei Monaten in Hamburg und habe eine neue Wohnung gefunden. Sie ist klein, aber gemütlich. Letzte Woche bin ich ins Kino gegangen und habe einen deutschen Film gesehen. Ich habe fast alles verstanden! Nächsten Monat muss ich für die Arbeit nach München fahren. Vielleicht können wir uns dort treffen? Schreib mir bald zurück. Viele Grüße, Sara`,
  questions:[
    {id:'r03q1', prompt:'Wie lange wohnt Sara schon in Hamburg?', options:['drei Wochen','drei Monate','drei Jahre','einen Monat'], correct:'drei Monate'},
    {id:'r03q2', prompt:'Was hat Sara letzte Woche gemacht?', options:['eine Reise gemacht','einen Film gesehen','ein Buch gelesen','gearbeitet'], correct:'einen Film gesehen'},
    {id:'r03q3', prompt:'Wohin muss Sara nächsten Monat fahren?', options:['Berlin','Kabul','München','Hamburg'], correct:'München'},
  ],
},
{
  id:'r04', level:'A2', title:'Der erste Arbeitstag', topic:'work',
  text:`Heute war mein erster Arbeitstag in der neuen Firma. Ich war ein bisschen nervös, aber alle Kollegen waren sehr freundlich. Mein Chef hat mir das Büro gezeigt und mir alle wichtigen Kollegen vorgestellt. Am Vormittag habe ich viele neue Informationen bekommen. Am Nachmittag habe ich schon meine erste kleine Aufgabe gemacht. Ich glaube, die Arbeit wird mir gefallen.`,
  questions:[
    {id:'r04q1', prompt:'Wie hat sich die Person am Anfang gefühlt?', options:['gelangweilt','nervös','wütend','müde'], correct:'nervös'},
    {id:'r04q2', prompt:'Wann hat die Person die erste Aufgabe gemacht?', options:['am Morgen','am Vormittag','am Nachmittag','am Abend'], correct:'am Nachmittag'},
  ],
},
];

/* ---------------- LISTENING LAB ----------------
   No real audio pipeline exists in this build (no TTS/audio
   assets are generated or shipped) — the honest, non-fake
   version of a "listening" exercise here is transcript-based
   comprehension practice, clearly labelled as such in the UI
   rather than presented as if real audio were playing. */
const LISTENING_ITEMS = [
{
  id:'li01', level:'A1', title:'Am Telefon', topic:'phone-call',
  transcript:`A: Hallo, hier ist Peter. Ist da Frau Meyer?\nB: Ja, am Apparat.\nA: Guten Tag, Frau Meyer. Ich habe morgen einen Termin bei Ihnen, aber ich kann leider nicht kommen.\nB: Kein Problem. Wann passt es Ihnen besser?\nA: Vielleicht am Donnerstag um zehn Uhr?\nB: Das geht. Bis Donnerstag!`,
  questions:[
    {id:'li01q1', prompt:'Warum ruft Peter an?', options:['Er will einen neuen Termin machen.','Er hat eine Frage zum Preis.','Er will sich beschweren.','Er sucht eine Adresse.'], correct:'Er will einen neuen Termin machen.'},
    {id:'li01q2', prompt:'Wann ist der neue Termin?', options:['Mittwoch um zehn','Donnerstag um zehn','Donnerstag um zwölf','Freitag um zehn'], correct:'Donnerstag um zehn'},
  ],
},
{
  id:'li02', level:'A2', title:'Durchsage am Bahnhof', topic:'travel',
  transcript:`Achtung, eine wichtige Durchsage: Der Zug nach München, Abfahrt 14:15 Uhr, fährt heute von Gleis 7 statt Gleis 3. Wir bitten um Verständnis und wünschen eine gute Reise.`,
  questions:[
    {id:'li02q1', prompt:'Was hat sich geändert?', options:['die Uhrzeit','das Gleis','das Ziel','der Preis'], correct:'das Gleis'},
    {id:'li02q2', prompt:'Von welchem Gleis fährt der Zug jetzt?', options:['Gleis 3','Gleis 7','Gleis 14','Gleis 15'], correct:'Gleis 7'},
  ],
},
{
  id:'li03', level:'A2', title:'Beim Arzt', topic:'health',
  transcript:`Arzt: Guten Tag, was fehlt Ihnen denn?\nPatient: Ich habe seit zwei Tagen Kopfschmerzen und bin sehr müde.\nArzt: Haben Sie auch Fieber?\nPatient: Nein, ich glaube nicht.\nArzt: Gut, das ist wahrscheinlich nur eine Erkältung. Trinken Sie viel Wasser und ruhen Sie sich aus.`,
  questions:[
    {id:'li03q1', prompt:'Seit wann hat der Patient Kopfschmerzen?', options:['seit einem Tag','seit zwei Tagen','seit einer Woche','seit heute Morgen'], correct:'seit zwei Tagen'},
    {id:'li03q2', prompt:'Was empfiehlt der Arzt?', options:['Medikamente nehmen','ins Krankenhaus gehen','viel Wasser trinken und sich ausruhen','zu Hause bleiben und nichts essen'], correct:'viel Wasser trinken und sich ausruhen'},
  ],
},
];

/* ---------------- WRITING LAB ---------------- */
const WRITING_PROMPTS = [
  {id:'w01', level:'A1', type:'diary', title:'Ein Tag in deinem Leben', prompt:'Schreib 4-6 Sätze über einen typischen Tag in deinem Leben. Wann stehst du auf? Was machst du?', minWords:30},
  {id:'w02', level:'A1', type:'message', title:'Eine Nachricht an einen Freund', prompt:'Schreib eine kurze Nachricht (4-6 Sätze) an einen Freund. Lade ihn zum Kaffee ein.', minWords:25},
  {id:'w03', level:'A2', type:'email', title:'Termin absagen', prompt:'Schreib eine kurze E-Mail (5-8 Sätze), in der du einen Termin absagst und einen neuen Termin vorschlägst.', minWords:40},
  {id:'w04', level:'A2', type:'opinion', title:'Deine Meinung: Stadt oder Land?', prompt:'Schreib 6-8 Sätze: Lebst du lieber in der Stadt oder auf dem Land? Warum?', minWords:50},
  {id:'w05', level:'A2', type:'formal-letter', title:'Wohnung anfragen', prompt:'Schreib eine kurze, formelle Anfrage (6-10 Sätze) zu einer Wohnungsanzeige, die du interessant findest.', minWords:50},
];

/* ---------------- CONVERSATION LAB ----------------
   Framed honestly as structured guided-dialogue practice with a
   fixed branching script — NOT a free-form AI conversation partner.
   Each scenario is a short tree of NPC lines with 2-3 response
   options; picking a response shows how a native speaker might
   naturally continue, plus a brief note on the grammar/register used. */
const CONVERSATION_SCENARIOS = [
{
  id:'c01', level:'A1', title:'Im Café', topic:'café',
  steps:[
    {npc:'Guten Tag! Was möchten Sie trinken?',
     options:[
       {text:'Ich möchte einen Kaffee, bitte.', note:'"möchten" is the polite way to order.'},
       {text:'Einen Tee, bitte.', note:'Short and perfectly natural at a counter.'},
     ]},
    {npc:'Gerne. Sonst noch etwas?',
     options:[
       {text:'Nein, danke. Das ist alles.', note:'Standard way to end an order.'},
       {text:'Ja, auch ein Stück Kuchen, bitte.', note:'"auch" adds a second item smoothly.'},
     ]},
    {npc:'Das macht zusammen vier Euro fünfzig.',
     options:[
       {text:'Hier, bitte.', note:'Simple phrase when handing over money or a card.'},
       {text:'Kann ich mit Karte zahlen?', note:'Useful everyday question — "mit Karte zahlen" = to pay by card.'},
     ]},
  ],
},
{
  id:'c02', level:'A2', title:'Beim Arzt einen Termin machen', topic:'phone-call',
  steps:[
    {npc:'Praxis Dr. Schulz, guten Tag.',
     options:[
       {text:'Guten Tag, ich hätte gern einen Termin.', note:'"ich hätte gern" — polite Konjunktiv II for requests.'},
       {text:'Guten Tag, ich brauche einen Termin, es ist dringend.', note:'"dringend" signals urgency.'},
     ]},
    {npc:'Worum geht es denn?',
     options:[
       {text:'Ich habe seit zwei Tagen Halsschmerzen.', note:'"seit + Dativ" for how long a symptom has lasted.'},
       {text:'Ich brauche nur eine Kontrolle.', note:'"eine Kontrolle" = a routine check-up.'},
     ]},
    {npc:'Passt Ihnen Donnerstag um neun Uhr?',
     options:[
       {text:'Ja, das passt gut.', note:'Simple, natural confirmation.'},
       {text:'Geht es auch am Nachmittag?', note:'Politely proposing an alternative time.'},
     ]},
  ],
},
{
  id:'c03', level:'A2', title:'Wohnungsbesichtigung', topic:'housing',
  steps:[
    {npc:'Willkommen! Das ist das Wohnzimmer.',
     options:[
       {text:'Es ist sehr hell, das gefällt mir.', note:'"das gefällt mir" — dative construction for "I like that".'},
       {text:'Wie groß ist die Wohnung insgesamt?', note:'Practical follow-up question.'},
     ]},
    {npc:'Die Wohnung hat 65 Quadratmeter, zwei Zimmer.',
     options:[
       {text:'Und wie hoch ist die Miete?', note:'"die Miete" = rent — a key vocabulary word for housing.'},
       {text:'Ist die Küche auch dabei?', note:'"dabei sein" = to be included.'},
     ]},
    {npc:'Die Miete beträgt 850 Euro kalt.',
     options:[
       {text:'Das klingt fair. Kann ich mich bewerben?', note:'"sich bewerben" = to apply (for the apartment).'},
       {text:'Das ist etwas teuer für mich.', note:'Polite, honest way to decline.'},
     ]},
  ],
},
];

/* ---------------- EXAM PREPARATION ----------------
   Structure only — sections pull real questions from the existing
   PLACEMENT_TEST/GRAMMAR/LESSONS pools rather than inventing a
   separate, unvetted question bank. No official exam content or
   certification is implied (Goethe/telc/ÖSD names are provided as
   selectable *target* frameworks a learner is preparing for, not
   as licensed exam material). */
const EXAM_FRAMEWORKS = [
  {id:'goethe', name:'Goethe-Zertifikat', levels:['A1','A2','B1','B2','C1','C2']},
  {id:'telc', name:'telc Deutsch', levels:['A1','A2','B1','B2','C1']},
  {id:'osd', name:'ÖSD', levels:['A1','A2','B1','B2','C1','C2']},
];
const EXAM_SECTIONS = ['Lesen','Hören','Schreiben','Grammatik & Wortschatz'];

/* ---------------- CHALLENGES ----------------
   Definitions only; the app.js layer evaluates `check` against real
   local state (attempts/vocabProgress/sessions) — no invented numbers. */
const CHALLENGE_DEFS = [
  {id:'ch_10words', title:'10 Wörter heute', desc:'Review or learn 10 vocabulary words today.', target:10, metric:'wordsToday'},
  {id:'ch_lesson', title:'Eine Lektion abschließen', desc:'Complete one full lesson today.', target:1, metric:'lessonsToday'},
  {id:'ch_streak3', title:'3-Tage-Serie', desc:'Study on 3 days in a row.', target:3, metric:'streak'},
  {id:'ch_quiz', title:'Grammatik-Quiz', desc:'Finish a Grammar Lab quick quiz today.', target:1, metric:'quizzesToday'},
  {id:'ch_perfectlesson', title:'Perfekte Lektion', desc:'Finish a lesson with a 100% score.', target:1, metric:'perfectLessons'},
];

/* ---------------- ACHIEVEMENTS ----------------
   Unlock conditions are evaluated against real DB-derived stats in
   app.js (see computeAchievements). No numbers here are shown to
   the user until genuinely earned. */
const ACHIEVEMENT_DEFS = [
  {id:'ach_first_lesson', title:'Erste Lektion', desc:'Complete your first lesson.', check:(s)=>s.lessonsCompleted>=1},
  {id:'ach_streak7', title:'7-Tage-Serie', desc:'Study 7 days in a row.', check:(s)=>s.streak>=7},
  {id:'ach_words50', title:'50 Wörter', desc:'Have 50 words in review (learning or beyond).', check:(s)=>s.wordsSeen>=50},
  {id:'ach_words100', title:'100 Wörter', desc:'Have 100 words in review.', check:(s)=>s.wordsSeen>=100},
  {id:'ach_a1_complete', title:'A1 abgeschlossen', desc:'Complete every A1 lesson.', check:(s)=>s.a1Complete},
  {id:'ach_a2_complete', title:'A2 abgeschlossen', desc:'Complete every A2 lesson.', check:(s)=>s.a2Complete},
  {id:'ach_grammar_master', title:'Grammatik-Meister', desc:'Score 80%+ overall across Grammar Lab quizzes (min. 10 attempts).', check:(s)=>s.grammarAccuracy>=0.8 && s.grammarAttempts>=10},
  {id:'ach_reading', title:'Erste Lektüre', desc:'Finish your first reading text.', check:(s)=>s.readingsCompleted>=1},
  {id:'ach_writing', title:'Erster Text', desc:'Submit your first writing exercise.', check:(s)=>s.writingsCompleted>=1},
];

if(typeof module !== 'undefined' && module.exports){
  module.exports = { READING_TEXTS, LISTENING_ITEMS, WRITING_PROMPTS, CONVERSATION_SCENARIOS,
    EXAM_FRAMEWORKS, EXAM_SECTIONS, CHALLENGE_DEFS, ACHIEVEMENT_DEFS };
}

/* ============================================================
   VOCABULARY EXPANSION (Phase 4 — spec: word-type diversity,
   Urdu/Pashto translation architecture, new topic categories)

   Why a separate file rather than editing vocabulary.core.js /
   vocabulary.upper.js: those 494 entries are already validated
   and referenced by lesson vocabIds; this file is purely
   additive, so it can be reviewed/rolled back independently
   without touching anything already wired into lessons.

   Two genuine gaps this file fills:
   1. Word-type diversity. The existing pack is noun/verb/adj/adv
      heavy — zero pronouns, numbers, conjunctions, particles,
      interjections or determiners exist as standalone dictionary
      entries (they only appear inside grammar explanations).
      A real dictionary needs to answer "what is 'und'?" too.
   2. Urdu/Pashto translations. schema.js's `translations` field
      already exists but nothing populates it. Per spec §39
      ("if uncertain, omit the field"), Urdu/Pashto are added
      ONLY for the ~50 most basic, unambiguous everyday words
      (pronouns, numbers, core family/household nouns) where
      confidence is genuinely high — not guessed for idioms,
      collocations, or anything context-dependent.
   ============================================================ */
const VOCAB_EXPANSION = (() => {
  const D = (typeof DSL !== 'undefined') ? DSL : require('../core/dsl.js');
  const out = [];
  const g = (level, topic, lines) => { out.push(...D.vocab(level, topic, lines)); };

  /* ================= PRONOUNS (A0/A1) ================= */
  g('A0','pronouns',[
    "w|ich|pronoun|I|Ich heiße Lena.=My name is Lena.|+ur:میں|+ps:زه",
    "w|du|pronoun|you (informal, singular)|Du bist mein Freund.=You are my friend.|+ur:تم|+ps:ته",
    "w|er|pronoun|he|Er kommt aus Berlin.=He comes from Berlin.|+ur:وہ|+ps:هغه",
    "w|sie|pronoun|she; they|Sie wohnt in München.=She lives in Munich.|+ur:وہ|+ps:هغه",
    "w|es|pronoun|it|Es regnet.=It is raining.|+ur:یہ|+ps:دا",
    "w|wir|pronoun|we|Wir lernen Deutsch.=We are learning German.|+ur:ہم|+ps:موږ",
    "w|ihr|pronoun|you (informal, plural)|Ihr seid pünktlich.=You (all) are on time.|+ur:تم لوگ|+ps:تاسو",
    "w|Sie|pronoun|you (formal)|Wie heißen Sie?=What is your name? (formal)|+ur:آپ|+ps:تاسو (رسمي)|+id:v_sie_formal",
  ]);
  g('A1','pronouns',[
    "w|mein|determiner|my|Das ist mein Buch.=That is my book.|+ur:میرا|+ps:زما",
    "w|dein|determiner|your (informal)|Ist das dein Auto?=Is that your car?|+ur:تمہارا|+ps:ستا",
    "w|unser|determiner|our|Unser Haus ist klein.=Our house is small.|+ur:ہمارا|+ps:زموږ",
    "w|dieser|determiner|this|Dieser Mann ist mein Lehrer.=This man is my teacher.",
    "w|jeder|determiner|every, each|Jeder Tag ist anders.=Every day is different.",
    "w|man|pronoun|one, you (impersonal)|Man kann hier gut essen.=You can eat well here.",
    "w|jemand|pronoun|someone|Jemand hat angerufen.=Someone called.",
    "w|niemand|pronoun|nobody|Niemand war zu Hause.=Nobody was home.",
    "w|etwas|pronoun|something|Ich möchte etwas fragen.=I would like to ask something.",
    "w|nichts|pronoun|nothing|Ich habe nichts gesagt.=I said nothing.",
    "w|alle|pronoun|everyone, all|Alle sind gekommen.=Everyone came.",
    "w|welcher|pronoun|which|Welcher Bus fährt zum Bahnhof?=Which bus goes to the station?",
  ]);

  /* ================= NUMBERS (A0) ================= */
  g('A0','numbers',[
    "w|null|number|zero|Die Zahl ist null.=The number is zero.|+ur:صفر|+ps:صفر",
    "w|eins|number|one|Ich habe eins.=I have one.|+ur:ایک|+ps:یو",
    "w|zwei|number|two|Ich habe zwei Brüder.=I have two brothers.|+ur:دو|+ps:دوه",
    "w|drei|number|three|Drei Kinder spielen.=Three children are playing.|+ur:تین|+ps:درې",
    "w|vier|number|four|Vier Uhr nachmittags.=Four o'clock in the afternoon.|+ur:چار|+ps:څلور",
    "w|fünf|number|five|Fünf Minuten Pause.=Five minutes' break.|+ur:پانچ|+ps:پنځه",
    "w|sechs|number|six|Sechs Tage die Woche.=Six days a week.|+ur:چھ|+ps:شپږ",
    "w|sieben|number|seven|Sieben Tage hat die Woche.=A week has seven days.|+ur:سات|+ps:اووه",
    "w|acht|number|eight|Acht Stunden Schlaf.=Eight hours of sleep.|+ur:آٹھ|+ps:اته",
    "w|neun|number|nine|Neun Uhr morgens.=Nine in the morning.|+ur:نو|+ps:نه",
    "w|zehn|number|ten|Zehn Finger.=Ten fingers.|+ur:دس|+ps:لس",
    "w|hundert|number|hundred|Hundert Euro.=A hundred euros.|+ur:سو|+ps:سل",
    "w|tausend|number|thousand|Tausend Dank!=A thousand thanks!|+ur:ہزار|+ps:زر",
    "w|erste|number|first (ordinal)|Das ist mein erster Tag.=This is my first day.",
    "w|letzte|number|last|Das ist die letzte Frage.=This is the last question.",
  ]);

  /* ================= CONJUNCTIONS ================= */
  g('A1','conjunctions',[
    "w|und|conjunction|and|Ich koche und du deckst den Tisch.=I cook and you set the table.|+ur:اور|+ps:او",
    "w|aber|conjunction|but|Ich bin müde, aber glücklich.=I am tired but happy.|+ur:لیکن|+ps:مګر",
    "w|oder|conjunction|or|Tee oder Kaffee?=Tea or coffee?|+ur:یا|+ps:یا",
    "w|denn|conjunction|because (coordinating)|Ich bleibe, denn es regnet.=I am staying because it is raining.|+mistakeIds:mk_denn_vs_weil_order",
    "w|sondern|conjunction|but rather|Das ist nicht rot, sondern orange.=That is not red, but rather orange.",
  ]);
  g('A2','conjunctions',[
    "w|weil|conjunction|because (subordinating)|Ich lerne, weil ich die Prüfung bestehen will.=I am studying because I want to pass the exam.|+mistakeIds:mk_weil_verb_position",
    "w|dass|conjunction|that|Ich weiß, dass du recht hast.=I know that you are right.",
    "w|wenn|conjunction|if, whenever|Wenn ich Zeit habe, rufe ich an.=If I have time, I will call.",
    "w|obwohl|conjunction|although|Obwohl es kalt ist, gehen wir schwimmen.=Although it is cold, we are going swimming.",
    "w|damit|conjunction|so that|Ich erkläre es, damit du es verstehst.=I explain it so that you understand.",
  ]);

  /* ================= PREPOSITIONS ================= */
  g('A1','prepositions',[
    "w|in|preposition|in, into|Ich wohne in Berlin.=I live in Berlin.|+ur:میں|+ps:په",
    "w|an|preposition|at, on (vertical surface)|Das Bild hängt an der Wand.=The picture hangs on the wall.",
    "w|auf|preposition|on (horizontal surface)|Das Buch liegt auf dem Tisch.=The book is on the table.",
    "w|mit|preposition|with|Ich fahre mit dem Bus.=I travel by bus.|+ur:کے ساتھ|+ps:سره",
    "w|für|preposition|for|Das Geschenk ist für dich.=The gift is for you.|+ur:کے لیے|+ps:لپاره",
    "w|ohne|preposition|without|Ich trinke Kaffee ohne Zucker.=I drink coffee without sugar.",
    "w|bei|preposition|at, near, with (a person)|Ich wohne bei meiner Familie.=I live with my family.",
    "w|nach|preposition|to, after|Wir fahren nach Hause.=We are going home.",
    "w|von|preposition|from, of|Das Geschenk ist von meiner Mutter.=The gift is from my mother.",
    "w|zu|preposition|to|Ich gehe zu meiner Tante.=I am going to my aunt's.",
    "w|aus|preposition|from, out of|Ich komme aus Pakistan.=I come from Pakistan.|+ur:سے|+ps:څخه",
  ]);
  g('B1','prepositions',[
    "w|durch|preposition|through|Wir gehen durch den Park.=We walk through the park.",
    "w|um|preposition|around, at (time)|Der Kurs beginnt um acht Uhr.=The course starts at eight.",
    "w|gegen|preposition|against|Er ist gegen den Vorschlag.=He is against the proposal.",
    "w|trotz|preposition|despite|Trotz des Regens gehen wir raus.=Despite the rain we are going out.",
    "w|wegen|preposition|because of|Wegen der Prüfung lerne ich viel.=Because of the exam I am studying a lot.",
  ]);

  /* ================= PARTICLES & INTERJECTIONS ================= */
  g('B1','particles',[
    "w|doch|particle|after all, though (contradicting/insisting)|Das weißt du doch!=You know that, don't you!|+mistakeIds:mk_modalpartikel_position",
    "w|ja|particle|indeed (shared knowledge, surprise)|Das ist ja interessant!=That is interesting, isn't it!",
    "w|mal|particle|just, sometime (softens a request)|Schau mal!=Look!",
    "w|eben|particle|just, simply (resignation)|Das ist eben so.=That's just how it is.",
    "w|halt|particle|just (colloquial resignation)|Ich bin halt müde.=I'm just tired.",
    "w|wohl|particle|probably|Er ist wohl krank.=He is probably ill.",
  ]);
  g('A0','interjections',[
    "w|ach|interjection|oh, ah (surprise, regret)|Ach, wie schade!=Oh, what a shame!",
    "w|aha|interjection|aha, I see|Aha, jetzt verstehe ich.=Aha, now I understand.",
    "w|na|interjection|well (informal opener)|Na, wie geht's?=Well, how's it going?",
    "w|oh|interjection|oh|Oh, das ist schön!=Oh, that's nice!",
    "w|tja|interjection|well... (resigned)|Tja, das war's dann.=Well, that's that then.",
    "w|hoppla|interjection|whoops|Hoppla, das ist mir runtergefallen!=Whoops, I dropped that!",
  ]);

  /* ================= NEW TOPIC AREAS (spec §26 categories) ================= */
  g('B1','technology',[
    "n|Gerät|das|die Geräte|device|Mein Gerät ist kaputt.=My device is broken.",
    "n|Bildschirm|der|die Bildschirme|screen|Der Bildschirm ist zu klein.=The screen is too small.",
    "n|Anwendung|die|die Anwendungen|application, app|Die Anwendung stürzt oft ab.=The app crashes often.",
    "n|Verbindung|die|die Verbindungen|connection|Die Verbindung ist langsam.=The connection is slow.",
    "n|Datei|die|die Dateien|file|Ich habe die Datei gespeichert.=I saved the file.",
    "v|installieren|installiere/installierst/installiert|hat installiert|to install|Ich installiere die neue Version.=I am installing the new version.",
    "v|aktualisieren|aktualisiere/aktualisierst/aktualisiert|hat aktualisiert|to update|Bitte aktualisieren Sie die App.=Please update the app.",
    "a|digital||digital|Wir arbeiten digital.=We work digitally.",
  ]);
  g('B1','nature',[
    "n|Wald|der|die Wälder|forest|Wir wandern im Wald.=We are hiking in the forest.",
    "n|Fluss|der|die Flüsse|river|Der Fluss ist sehr breit.=The river is very wide.",
    "n|Berg|der|die Berge|mountain|Wir steigen auf den Berg.=We are climbing the mountain.",
    "n|Küste|die|die Küsten|coast|Die Küste ist wunderschön.=The coast is beautiful.",
    "n|Klima|das|die Klimata|climate|Das Klima verändert sich.=The climate is changing.",
    "n|Tier|das|die Tiere|animal|Ich mag Tiere sehr.=I like animals a lot.",
  ]);
  g('B2','society',[
    "n|Gesetz|das|die Gesetze|law|Das neue Gesetz tritt bald in Kraft.=The new law will soon take effect.",
    "n|Wahl|die|die Wahlen|election, choice|Die Wahl findet im Herbst statt.=The election takes place in autumn.",
    "n|Bürger|der|die Bürger|citizen|Jeder Bürger hat Rechte.=Every citizen has rights.",
    "n|Gerechtigkeit|die|—|justice|Sie kämpft für Gerechtigkeit.=She fights for justice.",
    "n|Ungleichheit|die|die Ungleichheiten|inequality|Ungleichheit ist ein großes Problem.=Inequality is a big problem.",
    "v|abstimmen|stimme ab/stimmst ab/stimmt ab|hat abgestimmt|to vote|Wir stimmen über den Vorschlag ab.=We are voting on the proposal.",
  ]);
  g('B2','science',[
    "n|Forschung|die|die Forschungen|research|Die Forschung braucht mehr Geld.=Research needs more funding.",
    "n|Experiment|das|die Experimente|experiment|Das Experiment war erfolgreich.=The experiment was successful.",
    "n|Wissenschaftler|der|die Wissenschaftler|scientist|Die Wissenschaftlerin erklärt die Studie.=The scientist explains the study.",
    "v|entdecken|entdecke/entdeckst/entdeckt|hat entdeckt|to discover|Sie haben etwas Neues entdeckt.=They discovered something new.",
    "v|beweisen|beweise/beweist/beweist|hat bewiesen|to prove|Das lässt sich nicht beweisen.=That cannot be proven.",
  ]);
  g('B2','culture',[
    "n|Kunst|die|die Künste|art|Sie interessiert sich für moderne Kunst.=She is interested in modern art.",
    "n|Ausstellung|die|die Ausstellungen|exhibition|Die Ausstellung ist bis Sonntag geöffnet.=The exhibition is open until Sunday.",
    "n|Literatur|die|—|literature|Er studiert deutsche Literatur.=He studies German literature.",
    "n|Tradition|die|die Traditionen|tradition|Diese Tradition ist sehr alt.=This tradition is very old.",
    "n|Brauch|der|die Bräuche|custom|Das ist ein schöner Brauch.=That is a nice custom.",
  ]);
  g('A2','emotions',[
    "n|Gefühl|das|die Gefühle|feeling|Ich habe ein gutes Gefühl.=I have a good feeling.",
    "a|stolz|stolzer/am stolzesten|proud|Ich bin stolz auf dich.=I am proud of you.",
    "a|eifersüchtig|eifersüchtiger/am eifersüchtigsten|jealous|Er ist ein bisschen eifersüchtig.=He is a bit jealous.",
    "a|einsam|einsamer/am einsamsten|lonely|Manchmal fühle ich mich einsam.=Sometimes I feel lonely.",
    "a|dankbar|dankbarer/am dankbarsten|grateful|Ich bin sehr dankbar dafür.=I am very grateful for that.",
    "a|gelangweilt||bored|Die Kinder sind gelangweilt.=The children are bored.",
  ]);
  g('A2','relationships',[
    "n|Beziehung|die|die Beziehungen|relationship|Wir haben eine gute Beziehung.=We have a good relationship.",
    "n|Ehe|die|die Ehen|marriage|Sie führen eine glückliche Ehe.=They have a happy marriage.",
    "v|sich verlieben|verliebe mich/verliebst dich/verliebt sich|hat sich verliebt|to fall in love|Sie haben sich schnell verliebt.=They fell in love quickly.",
    "v|sich trennen|trenne mich/trennst dich/trennt sich|hat sich getrennt|to break up, separate|Sie haben sich letztes Jahr getrennt.=They separated last year.",
    "v|vertrauen|vertraue/vertraust/vertraut|hat vertraut|to trust|Ich vertraue dir.=I trust you.",
  ]);

  return out;
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = { VOCAB_EXPANSION }; }

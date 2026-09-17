/* ============================================================
   LISTENING (spec §28-30)
   No audio synthesis exists in this app. Every item is
   transcript-based and clearly labelled as such — the learner
   reads a transcript designed to be read as if heard (with
   natural spoken features: hesitations, fillers, repetition)
   and answers comprehension questions. This is honest about
   what it is: a listening-STYLE exercise, not real audio.
   ============================================================ */
const LISTENING_ITEMS_RICH = (() => {
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');
  const mk = (id, level, title, situation, transcript, questions, opts) => ({
    id: S.ID_PREFIX.listening + id, level, title, situation,
    audioAvailable: false,
    disclosure: 'No audio is generated. This is a transcript-based listening exercise: read the transcript as if it were spoken, then answer.',
    transcript, speakerCount: (opts&&opts.speakerCount)||1, speed: (opts&&opts.speed)||'normal',
    questions: (questions||[]).map((q,i)=>({id:'q'+(i+1), ...q})),
    meta: S.meta(),
  });

  return [
  mk('a1_ansage_bahnhof','A1','Durchsage am Bahnhof','Public announcement',
    "Achtung, eine Durchsage: Der Zug nach München, Abfahrt 14 Uhr 30, hat heute zehn Minuten Verspätung. Wir bitten um Ihr Verständnis.",
    [
      {q:'Wohin fährt der Zug?', type:'mcq', options:['Berlin','München','Hamburg','Köln'], correct:'München'},
      {q:'Wie viel Verspätung hat der Zug?', type:'fill', accept:['zehn minuten','10 minuten']},
    ]),
  mk('a1_telefon_termin','A1','Telefongespräch: Terminvereinbarung','Making an appointment by phone',
    "— Zahnarztpraxis Dr. Bauer, guten Tag.\n— Guten Tag, ich hätte gern einen Termin.\n— Gerne. Waren Sie schon einmal bei uns?\n— Nein, das ist mein erster Termin.\n— Passt Ihnen Mittwoch um 9 Uhr?\n— Ja, das passt gut.\n— Gut, dann bis Mittwoch. Bitte bringen Sie Ihre Versichertenkarte mit.",
    [
      {q:'Wofür möchte die Person einen Termin?', type:'mcq', options:['Beim Arzt','Beim Zahnarzt','Bei der Bank','Im Restaurant'], correct:'Beim Zahnarzt'},
      {q:'Wann ist der Termin?', type:'fill', accept:['mittwoch um 9 uhr','mittwoch, 9 uhr']},
      {q:'Was soll die Person mitbringen?', type:'fill', accept:['die versichertenkarte','ihre versichertenkarte']},
    ], {speakerCount:2}),
  mk('a2_wettervorhersage','A2','Wettervorhersage im Radio','Weather forecast',
    "Und hier die Wettervorhersage für morgen: Am Vormittag ist es noch bewölkt, ab dem Nachmittag klart es auf und die Sonne kommt raus. Die Temperaturen erreichen bis zu 22 Grad. Am Abend wird es wieder kühler, und es könnte leichten Regen geben. Für die Autofahrer: Auf der A9 gibt es aktuell einen Stau wegen eines Unfalls.",
    [
      {q:'Wie wird das Wetter am Nachmittag?', type:'mcq', options:['Regnerisch','Bewölkt und kalt','Sonnig','Sehr windig'], correct:'Sonnig'},
      {q:'Wie hoch werden die Temperaturen?', type:'fill', accept:['22 grad','bis zu 22 grad']},
      {q:'Warum gibt es einen Stau auf der A9?', type:'fill', accept:['wegen eines unfalls','ein unfall']},
    ]),
  mk('a2_dialog_restaurant','A2','Im Restaurant bestellen','Ordering in a restaurant',
    "— Guten Abend, haben Sie schon gewählt?\n— Ja, ich hätte gern die Gemüsesuppe als Vorspeise und danach das Schnitzel mit Pommes.\n— Und für Sie?\n— Ich nehme den Salat mit Hühnchen. Und können wir noch zwei Gläser Wasser bekommen?\n— Natürlich, kommt sofort. Möchten Sie das Wasser mit oder ohne Kohlensäure?\n— Ohne, bitte.",
    [
      {q:'Was bestellt die erste Person als Hauptgericht?', type:'mcq', options:['Salat mit Hühnchen','Gemüsesuppe','Schnitzel mit Pommes','Fisch'], correct:'Schnitzel mit Pommes'},
      {q:'Was möchten die Gäste trinken?', type:'fill', accept:['wasser','zwei gläser wasser']},
      {q:'Möchten sie Wasser mit Kohlensäure?', type:'mcq', options:['Ja','Nein'], correct:'Nein'},
    ], {speakerCount:3}),
  mk('b1_podcast_ausschnitt','B1','Podcast-Ausschnitt: Umziehen in eine neue Stadt','Podcast excerpt',
    "… also, als ich vor zwei Jahren nach Leipzig gezogen bin, kannte ich niemanden. Am Anfang war das schwierig, ehrlich gesagt. Aber ich habe dann einen Sprachkurs gemacht, und dort habe ich ein paar Leute kennengelernt. Was mir auch geholfen hat, war, dass ich in einen Sportverein eingetreten bin — dort trifft man automatisch Leute mit ähnlichen Interessen. Heute, zwei Jahre später, fühle ich mich hier wirklich zu Hause. Mein Tipp für alle, die neu in einer Stadt sind: Wartet nicht darauf, dass Kontakte einfach so entstehen. Man muss aktiv etwas suchen — einen Kurs, einen Verein, irgendetwas.",
    [
      {q:'Wie lange lebt die Person schon in Leipzig?', type:'fill', accept:['zwei jahre','seit zwei jahren']},
      {q:'Was hat der Person geholfen, Leute kennenzulernen?', type:'mcq', options:['Nur die Arbeit','Ein Sprachkurs und ein Sportverein','Soziale Medien','Nachbarn'], correct:'Ein Sprachkurs und ein Sportverein'},
      {q:'Was ist der Tipp am Ende?', type:'fill', accept:['man muss aktiv etwas suchen','aktiv suchen, nicht warten']},
    ]),
  mk('b1_streitgespraech','B1','Diskussion: Sollten Schüler Handys in der Schule benutzen dürfen?','Discussion',
    "— Ich finde, Handys sollten in der Schule komplett verboten sein. Sie lenken nur ab.\n— Das sehe ich anders. Handys können auch pädagogisch genutzt werden, zum Beispiel für Recherche im Unterricht.\n— Ja, aber die meisten Schüler nutzen sie doch für soziale Medien, nicht für die Schule.\n— Das stimmt teilweise, aber man könnte klare Regeln einführen, statt ein komplettes Verbot.\n— Vielleicht hast du recht. Ein Kompromiss wäre vielleicht besser als ein Verbot.",
    [
      {q:'Welche Position vertritt der erste Sprecher zuerst?', type:'mcq', options:['Handys sollten erlaubt sein','Handys sollten verboten sein','Handys sind egal','Nur Lehrer dürfen Handys benutzen'], correct:'Handys sollten verboten sein'},
      {q:'Wozu kommt das Gespräch am Ende?', type:'mcq', options:['Zu keiner Einigung','Zu einem möglichen Kompromiss','Zu einem strikten Verbot','Beide bleiben bei ihrer Meinung'], correct:'Zu einem möglichen Kompromiss'},
    ], {speakerCount:2}),
  mk('b2_vortragsausschnitt','B2','Vortragsausschnitt: Digitalisierung im Mittelstand','Lecture excerpt',
    "… wenn wir uns die Digitalisierung im deutschen Mittelstand ansehen, fällt ein deutliches Muster auf: Größere Unternehmen investieren deutlich stärker in digitale Prozesse als kleine und mittlere Betriebe. Das liegt zum einen an den verfügbaren Ressourcen, zum anderen aber auch an einer gewissen Zurückhaltung gegenüber neuen Technologien, die man in kleineren, oft familiengeführten Unternehmen häufiger beobachtet. Interessant ist jedoch, dass genau diese Zurückhaltung mittelfristig zu einem Wettbewerbsnachteil werden könnte, wenn größere Konkurrenten durch Automatisierung Kosten senken können, während kleinere Betriebe an bewährten, aber ineffizienten Prozessen festhalten.",
    [
      {q:'Welches Muster beschreibt der Sprecher?', type:'mcq', options:['Kleine Unternehmen digitalisieren mehr als große','Große Unternehmen investieren mehr in Digitalisierung als kleine','Alle Unternehmen digitalisieren gleich viel','Digitalisierung betrifft nur die Industrie'], correct:'Große Unternehmen investieren mehr in Digitalisierung als kleine'},
      {q:'Welches Risiko nennt der Sprecher für kleinere Betriebe?', type:'fill', accept:['einen wettbewerbsnachteil','sie könnten einen wettbewerbsnachteil bekommen']},
    ]),
  mk('c1_nachrichtenbeitrag','C1','Nachrichtenbeitrag: Reform der Rentenversicherung','News segment',
    "Die Bundesregierung hat heute Eckpunkte für eine Reform der Rentenversicherung vorgestellt. Kernpunkt des Entwurfs ist eine schrittweise Anhebung des Renteneintrittsalters, verbunden mit flexibleren Übergangsmodellen für Beschäftigte in belastenden Berufen. Gewerkschaften kritisierten den Entwurf umgehend als unzureichend, während Wirtschaftsverbände ihn grundsätzlich begrüßten, jedoch eine konsequentere Umsetzung forderten. Die Opposition im Bundestag kündigte an, den Entwurf im Rahmen der parlamentarischen Beratungen kritisch zu prüfen. Eine endgültige Entscheidung wird voraussichtlich erst im kommenden Jahr fallen.",
    [
      {q:'Was ist der Kernpunkt des Reformentwurfs?', type:'fill', accept:['eine schrittweise anhebung des renteneintrittsalters','anhebung des renteneintrittsalters']},
      {q:'Wie reagierten Gewerkschaften auf den Entwurf?', type:'mcq', options:['Sehr positiv','Kritisch, als unzureichend','Neutral','Sie äußerten sich nicht'], correct:'Kritisch, als unzureichend'},
      {q:'Wann fällt voraussichtlich eine endgültige Entscheidung?', type:'fill', accept:['im kommenden jahr','nächstes jahr']},
    ]),
  ];
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = { LISTENING_ITEMS_RICH }; }

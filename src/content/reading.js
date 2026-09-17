/* ============================================================
   READING (spec §20-24)
   Every text is original (written for Wegweiser, not copied),
   levelled honestly, and paired with genuine comprehension
   questions rather than trivial lookups.
   ============================================================ */
const READING_TEXTS_RICH = (() => {
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');
  const mk = (id, level, title, type, text, questions, glossary) => ({
    id: S.ID_PREFIX.reading + id, level, title, textType: type, text,
    wordCount: text.split(/\s+/).length,
    questions: (questions||[]).map((q,i)=>({id:'q'+(i+1), ...q})),
    glossary: glossary || [], meta: S.meta(),
  });

  return [
  mk('a1_vorstellung','A1','Ein neuer Kollege','personal text',
    "Hallo! Ich heiße Karim und bin 27 Jahre alt. Ich komme aus Damaskus, aber ich wohne jetzt in Leipzig. Ich arbeite seit drei Monaten als Koch in einem kleinen Restaurant. Die Arbeit macht mir Spaß, aber Deutsch ist manchmal noch schwierig. Ich lerne jeden Abend eine Stunde. Am Wochenende spiele ich gern Fußball mit meinen Kollegen. Meine Familie wohnt noch in Syrien, aber wir telefonieren jede Woche.",
    [
      {q:'Wie alt ist Karim?', type:'mcq', options:['17','27','37','23'], correct:'27'},
      {q:'Was ist Karim von Beruf?', type:'mcq', options:['Lehrer','Koch','Student','Arzt'], correct:'Koch'},
      {q:'Wie oft lernt er Deutsch?', type:'fill', accept:['jeden abend','jeden abend eine stunde']},
      {q:'Wo wohnt seine Familie?', type:'fill', accept:['in syrien','syrien']},
    ], [{de:'die Arbeit macht mir Spaß', en:'I enjoy the work'}]),
  mk('a1_wohnungsanzeige','A1','Wohnungsanzeige','notice/advert',
    "Schöne 2-Zimmer-Wohnung in Berlin-Neukölln zu vermieten. 55 m², Küche, Bad mit Fenster, kleiner Balkon. Miete: 620 Euro warm. Die Wohnung ist ab dem 1. September frei. Haustiere sind leider nicht erlaubt. Bei Interesse bitte per E-Mail melden: wohnung.neukoelln@beispiel.de",
    [
      {q:'Wie groß ist die Wohnung?', type:'mcq', options:['35 m²','45 m²','55 m²','65 m²'], correct:'55 m²'},
      {q:'Was bedeutet "620 Euro warm"?', type:'mcq', options:['Nur die Miete, ohne Nebenkosten','Miete inklusive Nebenkosten','Eine Kaution','Der Preis für einen Monat Strom'], correct:'Miete inklusive Nebenkosten'},
      {q:'Darf man einen Hund mitbringen?', type:'mcq', options:['Ja, kostenlos','Ja, mit Extrakosten','Nein','Nur Katzen'], correct:'Nein'},
    ], [{de:'zu vermieten', en:'for rent'},{de:'erlaubt', en:'allowed'}]),
  mk('a2_email_termin','A2','E-Mail: Termin verschieben','email',
    "Liebe Frau Schulz,\n\nleider muss ich unseren Termin am Donnerstag um 10 Uhr absagen, weil ich krank bin. Ich war gestern beim Arzt und soll diese Woche zu Hause bleiben. Wäre es möglich, den Termin auf nächste Woche zu verschieben? Am Montag oder Dienstag hätte ich Zeit.\n\nEs tut mir sehr leid für die kurzfristige Absage. Bitte lassen Sie mich wissen, was für Sie passt.\n\nViele Grüße\nAmina Cengiz",
    [
      {q:'Warum sagt Amina den Termin ab?', type:'fill', accept:['sie ist krank','weil sie krank ist']},
      {q:'Wann hätte sie stattdessen Zeit?', type:'mcq', options:['Mittwoch oder Donnerstag','Montag oder Dienstag','Nur am Freitag','Am Wochenende'], correct:'Montag oder Dienstag'},
      {q:'Welchen Ton hat die E-Mail?', type:'mcq', options:['Sehr informell (wie ein SMS)','Höflich und formal','Wütend','Sehr kurz und unpersönlich'], correct:'Höflich und formal'},
    ], [{de:'kurzfristig', en:'at short notice'}]),
  mk('a2_bericht_wochenende','A2','Ein anstrengendes Wochenende','narrative',
    "Am Samstag wollte ich früh aufstehen, aber ich habe verschlafen. Zuerst bin ich schnell zum Markt gefahren und habe Obst und Gemüse gekauft. Danach habe ich meine Wohnung aufgeräumt, weil meine Schwester zu Besuch kommen wollte. Sie ist am Nachmittag angekommen, und wir haben zusammen gekocht. Plötzlich hat es angefangen zu regnen, also sind wir zu Hause geblieben und haben einen Film gesehen. Am Sonntag war ich sehr müde, aber es war trotzdem ein schönes Wochenende.",
    [
      {q:'Was ist zuerst passiert?', type:'mcq', options:['Sie hat gekocht','Sie ist zum Markt gefahren','Sie hat einen Film gesehen','Ihre Schwester ist angekommen'], correct:'Sie ist zum Markt gefahren'},
      {q:'Warum sind sie zu Hause geblieben?', type:'fill', accept:['es hat geregnet','weil es geregnet hat']},
      {q:'War das Wochenende trotzdem schön?', type:'mcq', options:['Ja','Nein','Das steht nicht im Text','Nur teilweise'], correct:'Ja'},
    ], []),
  mk('b1_zeitungsartikel','B1','Immer mehr Menschen arbeiten von zu Hause','newspaper article',
    "Seit einigen Jahren nimmt die Zahl der Menschen, die im Homeoffice arbeiten, stetig zu. Viele Unternehmen bieten ihren Mitarbeitern inzwischen die Möglichkeit, ein oder zwei Tage pro Woche von zu Hause aus zu arbeiten. Befürworter argumentieren, dass dadurch Pendelzeit gespart wird und die Mitarbeiter flexibler arbeiten können. Kritiker weisen jedoch darauf hin, dass der persönliche Austausch mit Kollegen leidet und manche Menschen sich zu Hause schwerer konzentrieren können. Experten empfehlen deshalb ein Mischmodell, bei dem Homeoffice und Büroarbeit kombiniert werden.",
    [
      {q:'Was ist ein Vorteil des Homeoffice laut Text?', type:'fill', accept:['man spart pendelzeit','pendelzeit wird gespart']},
      {q:'Was kritisieren Kritiker?', type:'mcq', options:['Die Kosten','Den fehlenden persönlichen Austausch','Die Technik','Die Arbeitszeiten'], correct:'Den fehlenden persönlichen Austausch'},
      {q:'Was empfehlen Experten?', type:'mcq', options:['Nur noch Homeoffice','Nur noch Büroarbeit','Ein Mischmodell','Kürzere Arbeitszeiten'], correct:'Ein Mischmodell'},
    ], [{de:'Befürworter', en:'proponents'},{de:'Pendelzeit', en:'commuting time'}]),
  mk('b1_beschwerdebrief','B1','Beschwerde wegen einer fehlerhaften Lieferung','formal letter',
    "Sehr geehrte Damen und Herren,\n\nam 3. März habe ich bei Ihnen einen Laptop bestellt (Bestellnummer 552341). Leider ist das Gerät beschädigt bei mir angekommen: Der Bildschirm hat einen Riss, und das Ladekabel fehlt komplett.\n\nIch bitte Sie, mir entweder ein neues, unbeschädigtes Gerät zuzusenden oder den vollen Kaufpreis zu erstatten. Da ich den Laptop dringend für die Arbeit benötige, wäre ich Ihnen für eine schnelle Rückmeldung sehr dankbar.\n\nMit freundlichen Grüßen\nDavid Owusu",
    [
      {q:'Was ist das Problem?', type:'mcq', options:['Der Laptop kam nicht an','Der Laptop ist beschädigt und das Kabel fehlt','Der Laptop war zu teuer','Der Laptop kam zu spät an'], correct:'Der Laptop ist beschädigt und das Kabel fehlt'},
      {q:'Was fordert David?', type:'mcq', options:['Nur eine Entschuldigung','Ein neues Gerät oder eine Rückzahlung','Einen Rabatt beim nächsten Kauf','Ein kostenloses Zubehör'], correct:'Ein neues Gerät oder eine Rückzahlung'},
      {q:'Ist der Brief formal oder informell?', type:'mcq', options:['Formal','Informell'], correct:'Formal'},
    ], [{de:'erstatten', en:'to refund'}]),
  mk('b2_kommentar','B2','Kommentar: Soll das Auto aus der Innenstadt verschwinden?', 'opinion piece',
    "Immer mehr deutsche Städte diskutieren, den Autoverkehr in der Innenstadt einzuschränken oder ganz zu verbieten. Befürworter dieser Maßnahme verweisen auf sauberere Luft, weniger Lärm und mehr Platz für Fußgänger und Radfahrer. Tatsächlich zeigen Studien aus Städten, die bereits Fahrverbote eingeführt haben, einen deutlichen Rückgang der Luftverschmutzung.\n\nGegner der Maßnahme argumentieren dagegen, dass insbesondere Geschäfte in der Innenstadt wirtschaftlich unter dem Rückgang der Kundschaft leiden könnten, und dass ältere oder eingeschränkte Menschen auf das Auto angewiesen seien. Zudem sei ein flächendeckendes Fahrverbot ohne einen gleichzeitigen Ausbau des öffentlichen Nahverkehrs kaum durchsetzbar.\n\nEin Kompromiss, wie er in mehreren Städten bereits erprobt wird, besteht aus einer Kombination von Tempolimits, ausgewiesenen Fußgängerzonen und einem gleichzeitigen Ausbau von Bus- und Bahnverbindungen. Ob dieser Mittelweg auf Dauer beide Seiten überzeugt, bleibt abzuwarten.",
    [
      {q:'Welches Argument bringen die Befürworter vor?', type:'fill', accept:['sauberere luft und weniger lärm','sauberere luft']},
      {q:'Warum könnte ein Fahrverbot problematisch sein?', type:'mcq', options:['Es ist zu teuer für die Stadt','Geschäfte könnten Kunden verlieren, und manche Menschen sind auf das Auto angewiesen','Es gibt zu wenig Autos','Niemand will weniger Lärm'], correct:'Geschäfte könnten Kunden verlieren, und manche Menschen sind auf das Auto angewiesen'},
      {q:'Was schlägt der Autor als Kompromiss vor?', type:'mcq', options:['Komplettes Verbot ohne Ausnahmen','Eine Kombination aus Tempolimits, Fußgängerzonen und besserem Nahverkehr','Gar keine Änderung','Höhere Parkgebühren als einzige Maßnahme'], correct:'Eine Kombination aus Tempolimits, Fußgängerzonen und besserem Nahverkehr'},
    ], [{de:'flächendeckend', en:'blanket, area-wide'},{de:'durchsetzbar', en:'enforceable'}]),
  mk('c1_fachartikel','C1','Der Fachkräftemangel im Gesundheitswesen','specialised article',
    "Der demografische Wandel stellt das deutsche Gesundheitssystem vor erhebliche Herausforderungen. Während die Zahl älterer, pflegebedürftiger Menschen kontinuierlich zunimmt, sinkt zugleich die Zahl der Berufstätigen, die für ihre Versorgung zur Verfügung stehen. Diese Entwicklung wird durch mehrere strukturelle Faktoren verschärft: Die Arbeitsbedingungen in Pflegeberufen werden von vielen als belastend empfunden, die Vergütung gilt im internationalen Vergleich als unterdurchschnittlich, und die Ausbildungskapazitäten wurden über Jahre nicht an den tatsächlichen Bedarf angepasst.\n\nAls Gegenmaßnahmen werden derzeit unter anderem eine gezielte Anwerbung ausländischer Fachkräfte, eine Digitalisierung administrativer Prozesse zur Entlastung des Personals sowie eine Reform der Ausbildungsvergütung diskutiert. Kritiker wenden allerdings ein, dass diese Maßnahmen die strukturellen Ursachen des Mangels nicht beseitigen, sondern lediglich seine Symptome abmildern.",
    [
      {q:'Welche strukturellen Faktoren verschärfen den Fachkräftemangel laut Text?', type:'mcq', options:['Nur die alternde Bevölkerung','Belastende Arbeitsbedingungen, niedrige Vergütung, unzureichende Ausbildungskapazitäten','Zu viele Auszubildende','Zu hohe Löhne'], correct:'Belastende Arbeitsbedingungen, niedrige Vergütung, unzureichende Ausbildungskapazitäten'},
      {q:'Was kritisieren die im Text erwähnten Kritiker an den Gegenmaßnahmen?', type:'fill', accept:['sie beseitigen die ursachen nicht, nur die symptome','sie lösen nur die symptome, nicht die ursachen']},
    ], [{de:'unterdurchschnittlich', en:'below average'},{de:'abmildern', en:'to mitigate'}]),
  mk('c2_essay','C2','Zwischen Nostalgie und Fortschritt: Anmerkungen zum Sprachwandel','essay',
    "Kaum ein Thema ruft im öffentlichen Diskurs so zuverlässig Empörung hervor wie der vermeintliche „Verfall“ der deutschen Sprache. Anglizismen, Jugendjargon, vereinfachte Grammatik in digitaler Kommunikation — all dies wird gerne als Symptom eines kulturellen Niedergangs gedeutet. Wer sich jedoch eingehender mit der Sprachgeschichte befasst, erkennt schnell, dass Sprachen sich seit jeher wandeln, und dass dieser Wandel weder linear noch zwangsläufig ein Verlust ist.\n\nEs wäre freilich naiv, jede Veränderung unkritisch zu begrüßen. Manche Entwicklungen — etwa der Rückgang eines differenzierten Wortschatzes zugunsten pauschaler Ausdrücke — verdienen durchaus eine kritische Betrachtung. Entscheidend ist jedoch, zwischen deskriptiver und normativer Sprachbetrachtung zu unterscheiden: Die Aufgabe der Linguistik ist es zu beschreiben, wie Sprache tatsächlich verwendet wird, nicht vorzuschreiben, wie sie verwendet werden sollte.",
    [
      {q:'Welche These vertritt der Autor gegenüber der "Verfalls"-Debatte?', type:'mcq', options:['Er stimmt der Verfallsthese voll zu','Er hält Sprachwandel für normal, aber nicht jede Veränderung für unkritisch hinnehmbar','Er lehnt jede Kritik an Sprachwandel ab','Er meint, die Sprache ändere sich nicht'], correct:'Er hält Sprachwandel für normal, aber nicht jede Veränderung für unkritisch hinnehmbar'},
      {q:'Welche Unterscheidung hält der Autor für zentral?', type:'fill', accept:['deskriptiv und normativ','zwischen deskriptiver und normativer sprachbetrachtung']},
    ], [{de:'deskriptiv', en:'descriptive'},{de:'normativ', en:'normative, prescriptive'}]),
  ];
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = { READING_TEXTS_RICH }; }

/* ============================================================
   VOCABULARY — B1 / B2 / C1 / C2 (spec §17)
   Independent, professional, academic and nuanced German.
   Same hand-written DSL as the core pack; at the upper levels
   collocations and fixed prepositions matter more than bare
   translations, so many entries carry +col / +syn / +opp data.
   ============================================================ */
const VOCAB_UPPER = (() => {
  const D = (typeof DSL !== 'undefined') ? DSL : require('../core/dsl.js');
  const out = [];
  const g = (level, topic, lines) => { out.push(...D.vocab(level, topic, lines)); };

  /* ================= B1 ================= */
  g('B1','work-career',[
    "n|Arbeitgeber|der|die Arbeitgeber|employer|Mein Arbeitgeber zahlt die Fortbildung.=My employer pays for the training.|+opp:Arbeitnehmer",
    "n|Arbeitnehmer|der|die Arbeitnehmer|employee|Der Arbeitnehmer hat Anspruch auf Urlaub.=The employee is entitled to leave.",
    "n|Fortbildung|die|die Fortbildungen|further training|Die Firma bietet Fortbildungen an.=The company offers further training.",
    "n|Anforderung|die|die Anforderungen|requirement|Die Anforderungen der Stelle sind hoch.=The requirements of the position are high.",
    "n|Erfahrung|die|die Erfahrungen|experience|Ich habe drei Jahre Erfahrung im Verkauf.=I have three years of experience in sales.|+col:Erfahrung sammeln,Erfahrung machen",
    "n|Verantwortung|die|die Verantwortungen|responsibility|Sie übernimmt viel Verantwortung.=She takes on a lot of responsibility.|+col:Verantwortung übernehmen,Verantwortung tragen",
    "n|Zuständigkeit|die|die Zuständigkeiten|area of responsibility|Das liegt nicht in meiner Zuständigkeit.=That is not my area of responsibility.",
    "n|Frist|die|die Fristen|deadline|Die Frist läuft am Freitag ab.=The deadline expires on Friday.|+col:eine Frist einhalten,eine Frist verlängern",
    "v|*einreichen|reiche ein/reichst ein/reicht ein|hat eingereicht|to submit|Ich habe die Unterlagen eingereicht.=I submitted the documents.",
    "v|erledigen|erledige/erledigst/erledigt|hat erledigt|to get done, to handle|Ich habe die Aufgabe erledigt.=I have completed the task.",
    "v|sich kümmern|kümmere mich/kümmerst dich/kümmert sich|hat sich gekümmert|to take care of|Ich kümmere mich um den Antrag.=I will take care of the application.",
    "v|*absprechen|spreche ab/sprichst ab/spricht ab|hat abgesprochen|to agree, to coordinate|Das müssen wir mit dem Chef absprechen.=We have to coordinate that with the boss.",
    "a|zuverlässig|zuverlässiger/am zuverlässigsten|reliable|Er ist ein zuverlässiger Kollege.=He is a reliable colleague.",
    "a|selbstständig|selbstständiger/am selbstständigsten|independent; self-employed|Sie arbeitet selbstständig.=She works independently / is self-employed.",
  ]);
  g('B1','bureaucracy',[
    "n|Antrag|der|die Anträge|application, request|Ich stelle einen Antrag auf Wohngeld.=I am applying for housing benefit.|+col:einen Antrag stellen,einen Antrag ablehnen",
    "v|bearbeiten|bearbeite/bearbeitest/bearbeitet|hat bearbeitet|to process, to handle|Die Behörde bearbeitet den Antrag.=The authority is processing the application.",
    "n|Behörde|die|die Behörden|authority|Die Behörde hat noch nicht geantwortet.=The authority has not replied yet.",
    "n|Aufenthaltstitel|der|die Aufenthaltstitel|residence permit|Mein Aufenthaltstitel ist bis 2027 gültig.=My residence permit is valid until 2027.",
    "n|Nachweis|der|die Nachweise|proof, evidence|Bitte legen Sie einen Nachweis vor.=Please provide proof.",
    "n|Gebühr|die|die Gebühren|fee|Die Gebühr beträgt 30 Euro.=The fee is 30 euros.",
    "n|Widerspruch|der|die Widersprüche|objection, appeal|Sie können Widerspruch einlegen.=You can file an objection.|+col:Widerspruch einlegen",
    "v|*vorlegen|lege vor/legst vor/legt vor|hat vorgelegt|to present, to submit|Legen Sie bitte Ihren Ausweis vor.=Please present your ID.",
    "v|bestätigen|bestätige/bestätigst/bestätigt|hat bestätigt|to confirm|Bitte bestätigen Sie den Termin.=Please confirm the appointment.",
    "v|ablehnen|lehne ab/lehnst ab/lehnt ab|hat abgelehnt|to reject|Der Antrag wurde abgelehnt.=The application was rejected.",
    "a|gültig|gültiger/am gültigsten|valid|Der Ausweis ist noch gültig.=The ID is still valid.",
    "a|zuständig||responsible, in charge|Wer ist dafür zuständig?=Who is responsible for that?",
  ]);
  g('B1','society',[
    "n|Gesellschaft|die|die Gesellschaften|society|Die Gesellschaft verändert sich schnell.=Society is changing quickly.",
    "n|Entwicklung|die|die Entwicklungen|development|Die Entwicklung ist positiv.=The development is positive.",
    "n|Möglichkeit|die|die Möglichkeiten|possibility, option|Es gibt mehrere Möglichkeiten.=There are several options.",
    "n|Unterschied|der|die Unterschiede|difference|Der Unterschied ist groß.=The difference is big.|+col:einen Unterschied machen",
    "n|Vorteil|der|die Vorteile|advantage|Der größte Vorteil ist die Lage.=The biggest advantage is the location.|+opp:Nachteil",
    "n|Nachteil|der|die Nachteile|disadvantage|Der Nachteil ist der Preis.=The disadvantage is the price.",
    "n|Umwelt|die|—|environment|Wir müssen die Umwelt schützen.=We have to protect the environment.",
    "n|Bildung|die|—|education|Bildung ist eine gute Investition.=Education is a good investment.",
    "v|sich verändern|verändere mich/veränderst dich/verändert sich|hat sich verändert|to change|Die Stadt hat sich sehr verändert.=The city has changed a lot.",
    "v|vergleichen|vergleiche/vergleichst/vergleicht|hat verglichen|to compare|Man muss die Angebote vergleichen.=You have to compare the offers.",
    "v|beeinflussen|beeinflusse/beeinflusst/beeinflusst|hat beeinflusst|to influence|Das Wetter beeinflusst meine Stimmung.=The weather influences my mood.",
    "v|verzichten|verzichte/verzichtest/verzichtet|hat verzichtet|to do without|Ich verzichte auf das Auto.=I do without a car.|+col:verzichten auf",
  ]);
  g('B1','communication',[
    "n|Auskunft|die|die Auskünfte|information|Können Sie mir eine Auskunft geben?=Can you give me some information?",
    "n|Missverständnis|das|die Missverständnisse|misunderstanding|Das war ein Missverständnis.=That was a misunderstanding.",
    "n|Absprache|die|die Absprachen|arrangement|Nach Absprache ist das möglich.=By arrangement that is possible.",
    "n|Hinweis|der|die Hinweise|hint, note|Danke für den Hinweis.=Thanks for the tip.",
    "v|mitteilen|teile mit/teilst mit/teilt mit|hat mitgeteilt|to inform, to notify|Wir teilen Ihnen das Ergebnis mit.=We will inform you of the result.",
    "v|sich beziehen|beziehe mich/beziehst dich/bezieht sich|hat sich bezogen|to refer to|Ich beziehe mich auf Ihr Schreiben.=I refer to your letter.|+col:sich beziehen auf",
    "v|betonen|betone/betonst/betont|hat betont|to emphasise|Er hat betont, dass es wichtig ist.=He emphasised that it is important.",
    "v|zugeben|gebe zu/gibst zu/gibt zu|hat zugegeben|to admit|Ich muss zugeben, dass ich mich geirrt habe.=I must admit that I was wrong.",
    "v|sich irren|irre mich/irrst dich/irrt sich|hat sich geirrt|to be mistaken|Da irrst du dich.=You are mistaken there.",
    "p|Meiner Meinung nach …|In my opinion …|Meiner Meinung nach sollte man das ändern.=In my opinion that should be changed.",
    "p|Ich bin der Ansicht, dass …|I take the view that …|Ich bin der Ansicht, dass wir mehr Zeit brauchen.=I take the view that we need more time.",
    "p|Das kommt darauf an.|That depends.|Das kommt darauf an, wie viel Zeit wir haben.=That depends on how much time we have.",
  ]);

  /* ================= B2 ================= */
  g('B2','argument',[
    "n|These|die|die Thesen|thesis, claim|Die These lässt sich gut belegen.=The claim can be well supported.",
    "n|Argument|das|die Argumente|argument|Das ist ein überzeugendes Argument.=That is a convincing argument.|+col:ein Argument vorbringen,ein Argument entkräften",
    "n|Beleg|der|die Belege|piece of evidence|Für diese Aussage fehlt der Beleg.=There is no evidence for this statement.",
    "n|Einwand|der|die Einwände|objection|Gegen diesen Vorschlag gibt es einen Einwand.=There is an objection to this proposal.|+col:einen Einwand erheben",
    "n|Zusammenhang|der|die Zusammenhänge|connection, context|Es gibt einen klaren Zusammenhang.=There is a clear connection.|+col:im Zusammenhang mit",
    "n|Voraussetzung|die|die Voraussetzungen|prerequisite|Gute Deutschkenntnisse sind Voraussetzung.=Good German is a prerequisite.",
    "n|Folge|die|die Folgen|consequence|Die Folgen sind noch nicht absehbar.=The consequences are not yet foreseeable.|+col:Folgen haben,zur Folge haben",
    "v|behaupten|behaupte/behauptest/behauptet|hat behauptet|to claim|Er behauptet, nichts gewusst zu haben.=He claims he knew nothing.",
    "v|belegen|belege/belegst/belegt|hat belegt|to substantiate|Die Studie belegt diesen Trend.=The study substantiates this trend.",
    "v|widersprechen|widerspreche/widersprichst/widerspricht|hat widersprochen|to contradict|Ich muss Ihnen widersprechen.=I have to disagree with you.",
    "v|einräumen|räume ein/räumst ein/räumt ein|hat eingeräumt|to concede|Man muss einräumen, dass es Risiken gibt.=One has to concede that there are risks.",
    "v|abwägen|wäge ab/wägst ab/wägt ab|hat abgewogen|to weigh up|Man muss Vor- und Nachteile abwägen.=One has to weigh up pros and cons.",
    "a|überzeugend|überzeugender/am überzeugendsten|convincing|Die Begründung war überzeugend.=The reasoning was convincing.",
    "a|umstritten|umstrittener/am umstrittensten|controversial|Die Maßnahme ist umstritten.=The measure is controversial.",
    "a|erheblich|erheblicher/am erheblichsten|considerable|Die Kosten sind erheblich gestiegen.=The costs have risen considerably.",
  ]);
  g('B2','professional',[
    "n|Maßnahme|die|die Maßnahmen|measure|Die Maßnahme wurde umgesetzt.=The measure was implemented.|+col:Maßnahmen ergreifen,eine Maßnahme umsetzen",
    "n|Vorgehen|das|—|approach, procedure|Das Vorgehen war korrekt.=The procedure was correct.",
    "n|Ergebnis|das|die Ergebnisse|result|Das Ergebnis liegt morgen vor.=The result will be available tomorrow.",
    "n|Anforderungsprofil|das|die Anforderungsprofile|job requirement profile|Das Anforderungsprofil ist anspruchsvoll.=The requirement profile is demanding.",
    "n|Fachkraft|die|die Fachkräfte|skilled worker|Es fehlen qualifizierte Fachkräfte.=There is a shortage of qualified skilled workers.",
    "n|Zusammenarbeit|die|—|cooperation|Die Zusammenarbeit läuft gut.=The cooperation is going well.",
    "n|Herausforderung|die|die Herausforderungen|challenge|Das ist eine große Herausforderung.=That is a big challenge.",
    "v|umsetzen|setze um/setzt um/setzt um|hat umgesetzt|to implement|Wir setzen den Plan nächste Woche um.=We will implement the plan next week.",
    "v|durchführen|führe durch/führst durch/führt durch|hat durchgeführt|to carry out|Wir führen eine Umfrage durch.=We are carrying out a survey.",
    "v|gewährleisten|gewährleiste/gewährleistest/gewährleistet|hat gewährleistet|to ensure|Die Qualität muss gewährleistet sein.=Quality must be ensured.",
    "v|berücksichtigen|berücksichtige/berücksichtigst/berücksichtigt|hat berücksichtigt|to take into account|Wir berücksichtigen Ihre Wünsche.=We will take your wishes into account.",
    "v|zur Verfügung stellen|stelle/stellst/stellt|hat gestellt|to make available|Wir stellen Ihnen die Unterlagen zur Verfügung.=We will make the documents available to you.",
    "a|verbindlich|verbindlicher/am verbindlichsten|binding|Die Zusage ist verbindlich.=The commitment is binding.",
    "a|nachhaltig|nachhaltiger/am nachhaltigsten|sustainable|Das ist keine nachhaltige Lösung.=That is not a sustainable solution.",
  ]);
  g('B2','media-tech',[
    "n|Datenschutz|der|—|data protection|Der Datenschutz hat hier Priorität.=Data protection is a priority here.",
    "n|Zugang|der|die Zugänge|access|Der Zugang zu den Daten ist beschränkt.=Access to the data is restricted.",
    "n|Auswirkung|die|die Auswirkungen|impact|Die Auswirkungen sind messbar.=The effects are measurable.|+col:Auswirkungen haben auf",
    "n|Anteil|der|die Anteile|share, proportion|Der Anteil junger Nutzer steigt.=The share of young users is rising.",
    "n|Entwicklungstempo|das|—|pace of development|Das Entwicklungstempo ist hoch.=The pace of development is high.",
    "v|zunehmen|nehme zu/nimmst zu/nimmt zu|hat zugenommen|to increase|Die Nutzung hat deutlich zugenommen.=Usage has increased significantly.|+opp:abnehmen",
    "v|abnehmen|nehme ab/nimmst ab/nimmt ab|hat abgenommen|to decrease|Die Zahl der Anrufe hat abgenommen.=The number of calls has decreased.",
    "v|betreffen|betreffe/betriffst/betrifft|hat betroffen|to concern, to affect|Das betrifft alle Mitarbeiter.=That affects all employees.",
    "v|voraussetzen|setze voraus/setzt voraus/setzt voraus|hat vorausgesetzt|to presuppose, to require|Die Stelle setzt Erfahrung voraus.=The position requires experience.",
  ]);

  /* ================= C1 ================= */
  g('C1','academic',[
    "n|Erkenntnis|die|die Erkenntnisse|finding, insight|Die Studie liefert neue Erkenntnisse.=The study provides new insights.",
    "n|Hypothese|die|die Hypothesen|hypothesis|Die Hypothese wurde bestätigt.=The hypothesis was confirmed.|+col:eine Hypothese aufstellen,eine Hypothese überprüfen",
    "n|Untersuchungsgegenstand|der|die Untersuchungsgegenstände|object of study|Der Untersuchungsgegenstand wird eingegrenzt.=The object of study is narrowed down.",
    "n|Bezugnahme|die|die Bezugnahmen|reference|Unter Bezugnahme auf Ihr Schreiben …=With reference to your letter …",
    "n|Widerspruch|der|die Widersprüche|contradiction|Der Text enthält einen inneren Widerspruch.=The text contains an internal contradiction.|+id:v_widerspruch_contradiction",
    "n|Tragweite|die|—|significance, scope|Die Tragweite der Entscheidung ist enorm.=The significance of the decision is enormous.",
    "v|erörtern|erörtere/erörterst/erörtert|hat erörtert|to discuss in detail|Der Aufsatz erörtert mehrere Ansätze.=The essay discusses several approaches.",
    "v|nachvollziehen|vollziehe nach/vollziehst nach/vollzieht nach|hat nachvollzogen|to comprehend, to follow|Ich kann Ihre Argumentation nachvollziehen.=I can follow your reasoning.",
    "v|hervorheben|hebe hervor/hebst hervor/hebt hervor|hat hervorgehoben|to emphasise|Die Autorin hebt drei Punkte hervor.=The author emphasises three points.",
    "v|zurückführen|führe zurück/führst zurück/führt zurück|hat zurückgeführt|to attribute|Der Effekt lässt sich auf zwei Faktoren zurückführen.=The effect can be attributed to two factors.|+col:zurückführen auf",
    "v|relativieren|relativiere/relativierst/relativiert|hat relativiert|to qualify, to put in perspective|Diese Zahl muss man relativieren.=This figure must be put into perspective.",
    "a|schlüssig|schlüssiger/am schlüssigsten|coherent, conclusive|Die Argumentation ist schlüssig.=The argumentation is coherent.",
    "a|maßgeblich|maßgeblicher/am maßgeblichsten|decisive, authoritative|Maßgeblich ist der Wortlaut des Gesetzes.=The wording of the law is decisive.",
    "a|vorläufig||provisional|Das sind vorläufige Ergebnisse.=These are provisional results.",
  ]);
  g('C1','idioms',[
    "p|etwas in Betracht ziehen|to consider something|Wir ziehen mehrere Varianten in Betracht.=We are considering several options.|+id:v_in_betracht_ziehen_placeholder",
    "p|in Frage stellen|to call into question|Niemand stellt seine Kompetenz in Frage.=Nobody calls his competence into question.",
    "p|zur Sprache bringen|to bring up (a topic)|Ich möchte einen Punkt zur Sprache bringen.=I would like to raise one point.",
    "p|auf dem Laufenden bleiben|to stay up to date|Ich bleibe über den Newsletter auf dem Laufenden.=I stay up to date via the newsletter.",
    "p|aus dem Ruder laufen|to get out of hand|Die Kosten sind aus dem Ruder gelaufen.=The costs got out of hand.",
    "p|den Rahmen sprengen|to go beyond the scope|Eine vollständige Analyse würde den Rahmen sprengen.=A full analysis would go beyond the scope.",
    "p|ins Gewicht fallen|to carry weight, to matter|Dieser Faktor fällt kaum ins Gewicht.=This factor hardly matters.",
    "p|Hand in Hand gehen|to go hand in hand|Qualität und Kosten gehen nicht immer Hand in Hand.=Quality and cost do not always go hand in hand.",
    "p|unter Druck setzen|to put under pressure|Man sollte niemanden unter Druck setzen.=Nobody should be put under pressure.",
    "p|zur Kenntnis nehmen|to take note of|Wir haben Ihre Mitteilung zur Kenntnis genommen.=We have taken note of your message.",
  ]);

  /* ================= C2 ================= */
  g('C2','nuance',[
    "n|Nuance|die|die Nuancen|nuance|Der Unterschied liegt in der Nuance.=The difference lies in the nuance.",
    "n|Andeutung|die|die Andeutungen|hint, insinuation|Er machte nur eine Andeutung.=He only made a hint.",
    "n|Untertreibung|die|die Untertreibungen|understatement|Das ist eine gewaltige Untertreibung.=That is a massive understatement.",
    "n|Beiklang|der|die Beiklänge|connotation|Das Wort hat einen negativen Beiklang.=The word has a negative connotation.",
    "n|Gepflogenheit|die|die Gepflogenheiten|custom, convention|Das entspricht nicht den üblichen Gepflogenheiten.=That does not conform to the usual conventions.",
    "v|verkennen|verkenne/verkennst/verkennt|hat verkannt|to misjudge|Man darf die Risiken nicht verkennen.=One must not misjudge the risks.",
    "v|beschönigen|beschönige/beschönigst/beschönigt|hat beschönigt|to gloss over|Der Bericht beschönigt die Lage.=The report glosses over the situation.",
    "v|unterstellen|unterstelle/unterstellst/unterstellt|hat unterstellt|to insinuate, to impute|Ich möchte niemandem böse Absicht unterstellen.=I do not wish to impute bad intent to anyone.",
    "v|abstrahieren|abstrahiere/abstrahierst/abstrahiert|hat abstrahiert|to abstract|Von Einzelfällen sollte man abstrahieren.=One should abstract from individual cases.",
    "a|subtil|subtiler/am subtilsten|subtle|Die Kritik war subtil formuliert.=The criticism was subtly phrased.",
    "a|einschlägig||relevant, pertinent|Er verweist auf die einschlägige Literatur.=He refers to the relevant literature.",
    "a|gravierend|gravierender/am gravierendsten|serious, grave|Das ist ein gravierender Unterschied.=That is a serious difference.",
    "a|zwangsläufig||inevitable|Das führt zwangsläufig zu Konflikten.=That inevitably leads to conflicts.",
  ]);
  g('C2','register',[
    "v|erhalten|erhalte/erhältst/erhält|hat erhalten|to receive (formal)|Wir haben Ihre Unterlagen erhalten.=We have received your documents.|+syn:bekommen,kriegen",
    "v|kriegen|kriege/kriegst/kriegt|hat gekriegt|to get (colloquial)|Ich hab deine Mail gekriegt.=I got your mail.|+syn:bekommen,erhalten",
    "v|betrachten|betrachte/betrachtest/betrachtet|hat betrachtet|to regard, to view (formal)|Wir betrachten die Sache als erledigt.=We regard the matter as settled.",
    "v|veranlassen|veranlasse/veranlasst/veranlasst|hat veranlasst|to arrange for, to cause|Wir haben die Zahlung veranlasst.=We have arranged the payment.",
    "v|obliegen|obliege/obliegst/obliegt|hat oblegen|to be incumbent upon|Die Entscheidung obliegt der Geschäftsführung.=The decision rests with the management.",
    "n|Schriftverkehr|der|—|correspondence|Der gesamte Schriftverkehr wird archiviert.=All correspondence is archived.",
    "n|Sachverhalt|der|die Sachverhalte|facts of the matter|Der Sachverhalt ist komplex.=The facts of the matter are complex.",
    "n|Anliegen|das|die Anliegen|concern, request|Wir haben Ihr Anliegen weitergeleitet.=We have forwarded your request.",
  ]);

  return out;
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = { VOCAB_UPPER }; }

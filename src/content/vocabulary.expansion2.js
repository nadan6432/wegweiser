/* ============================================================
   VOCABULARY EXPANSION 2 (Phase 5)

   The Phase 4.5 audit (see ARCHITECTURE.md) found a clear,
   measurable imbalance: A1 alone held 301 of 657 words while
   B1/B2/C1/C2 together held only 174, and B1-C2 combined had
   almost no adverbs, conjunctions, or particles at all (B2/C1/C2
   had literally zero of each). This pack is deliberately weighted
   to correct that — most of it is B1 through C2, and a meaningful
   share is function words rather than more nouns, per the
   phase's own instruction not to let noun coverage crowd out
   everything else.

   Same DSL, same quality bar as every previous pack: every line
   is hand-written, checked German; nothing here is mechanically
   generated. A final ID-collision and content-integrity check
   (tests/test_phase5.js) runs against the full merged dataset,
   not just this file in isolation.
   ============================================================ */
const VOCAB_EXPANSION2 = (() => {
  const D = (typeof DSL !== 'undefined') ? DSL : require('../core/dsl.js');
  const out = [];
  const g = (level, topic, lines) => { out.push(...D.vocab(level, topic, lines)); };

  /* ================= A2 — fill the gaps (particles, phrases, discourse) ================= */
  g('A2','discourse',[
    "w|also|particle|so, well then|Also, dann bis morgen!=So, see you tomorrow then!",
    "w|na ja|particle|well, I mean|Na ja, das kann man so sehen.=Well, you could see it that way.",
    "w|eigentlich|adv|actually|Eigentlich habe ich keine Zeit.=Actually, I don't have time.",
    "w|sowieso|adv|anyway, in any case|Ich komme sowieso zu spät.=I'm going to be late anyway.",
    "w|jedenfalls|adv|in any case, anyway|Jedenfalls war es ein schöner Tag.=In any case, it was a nice day.",
    "w|übrigens|adv|by the way|Übrigens, hast du meine Nachricht bekommen?=By the way, did you get my message?",
    "p|Keine Ahnung.|No idea.|Wo ist der Bahnhof? – Keine Ahnung.=Where is the station? – No idea.",
    "p|Kein Problem.|No problem.|Kannst du mir helfen? – Kein Problem.=Can you help me? – No problem.",
    "p|Macht nichts.|It doesn't matter, never mind.|Ich bin spät dran. – Macht nichts.=I'm running late. – Never mind.",
  ]);
  g('A2','environment',[
    "n|Müll|der|—|rubbish, waste|Bitte trenne den Müll.=Please sort the rubbish.",
    "v|recyceln|recycle/recycelst/recycelt|hat recycelt|to recycle|Wir recyceln Glas und Papier.=We recycle glass and paper.",
    "a|umweltfreundlich|umweltfreundlicher/am umweltfreundlichsten|environmentally friendly|Das Auto ist sehr umweltfreundlich.=The car is very environmentally friendly.",
  ]);
  g('A2','media',[
    "n|Sendung|die|die Sendungen|broadcast, programme|Die Sendung beginnt um acht.=The programme starts at eight.",
    "n|Beitrag|der|die Beiträge|article, contribution|Ich habe einen interessanten Beitrag gelesen.=I read an interesting article.",
    "v|veröffentlichen|veröffentliche/veröffentlichst/veröffentlicht|hat veröffentlicht|to publish|Sie veröffentlicht jede Woche einen Artikel.=She publishes an article every week.",
  ]);

  /* ================= B1 — adverbs, connectors, expanded topics ================= */
  g('B1','adverbs',[
    "w|allerdings|adv|however, though|Das stimmt, allerdings gibt es Ausnahmen.=That's true, though there are exceptions.",
    "w|tatsächlich|adv|actually, indeed|Er hat tatsächlich recht.=He is actually right.",
    "w|vermutlich|adv|presumably|Sie kommt vermutlich später.=She's presumably coming later.",
    "w|inzwischen|adv|meanwhile, by now|Inzwischen habe ich es verstanden.=By now I have understood it.",
    "w|gleichzeitig|adv|at the same time|Ich kann nicht zwei Dinge gleichzeitig machen.=I can't do two things at the same time.",
    "w|kaum|adv|hardly, scarcely|Ich habe kaum geschlafen.=I hardly slept.",
    "w|ständig|adv|constantly|Er beschwert sich ständig.=He constantly complains.",
    "w|ausschließlich|adv|exclusively|Der Kurs ist ausschließlich für Anfänger.=The course is exclusively for beginners.",
    "w|regelmäßig|adv|regularly|Ich gehe regelmäßig ins Fitnessstudio.=I regularly go to the gym.",
    "w|unbedingt|adv|absolutely, definitely|Das musst du unbedingt probieren.=You absolutely have to try that.",
  ]);
  g('B1','connectors',[
    "w|außer|preposition|except, apart from|Alle waren da außer meinem Bruder.=Everyone was there except my brother.",
    "w|falls|conjunction|in case, if|Falls es regnet, bleiben wir zu Hause.=In case it rains, we'll stay home.",
    "w|sobald|conjunction|as soon as|Ruf mich an, sobald du ankommst.=Call me as soon as you arrive.",
    "w|bevor|conjunction|before|Wasch dir die Hände, bevor du isst.=Wash your hands before you eat.",
    "w|nachdem|conjunction|after|Nachdem wir gegessen hatten, gingen wir spazieren.=After we had eaten, we went for a walk.",
  ]);
  g('B1','work-education',[
    "n|Kenntnis|die|die Kenntnisse|knowledge, skill|Gute Deutschkenntnisse sind wichtig.=Good German skills are important.",
    "n|Fähigkeit|die|die Fähigkeiten|ability, skill|Er hat eine besondere Fähigkeit zum Zuhören.=He has a special ability to listen.",
    "n|Verhandlung|die|die Verhandlungen|negotiation|Die Verhandlung dauerte drei Stunden.=The negotiation lasted three hours.",
    "n|Weiterbildung|die|die Weiterbildungen|further training|Die Firma bietet regelmäßige Weiterbildungen an.=The company regularly offers further training.",
    "n|Abschluss|der|die Abschlüsse|qualification, degree|Sie hat einen Abschluss in Wirtschaft.=She has a degree in economics.",
    "v|sich qualifizieren|qualifiziere mich/qualifizierst dich/qualifiziert sich|hat sich qualifiziert|to qualify|Er hat sich für die Stelle qualifiziert.=He qualified for the position.",
    "v|delegieren|delegiere/delegierst/delegiert|hat delegiert|to delegate|Ein guter Chef delegiert Aufgaben.=A good boss delegates tasks.",
  ]);
  g('B1','society-b1',[
    "n|Vielfalt|die|—|diversity|Die Stadt ist bekannt für ihre kulturelle Vielfalt.=The city is known for its cultural diversity.",
    "n|Zusammenhalt|der|—|solidarity, cohesion|In der Krise war der Zusammenhalt wichtig.=Solidarity was important during the crisis.",
    "n|Herkunft|die|die Herkünfte|origin, background|Woher stammt deine Familie ursprünglich? Was ist eure Herkunft?=Where does your family originally come from? What is your background?",
    "a|vielfältig|vielfältiger/am vielfältigsten|diverse, varied|Das Angebot an Kursen ist sehr vielfältig.=The range of courses is very diverse.",
    "v|sich integrieren|integriere mich/integrierst dich/integriert sich|hat sich integriert|to integrate|Es dauert Zeit, sich in einem neuen Land zu integrieren.=It takes time to integrate into a new country.",
  ]);

  /* ================= B2 — academic/professional, discourse, hedging ================= */
  g('B2','discourse',[
    "w|zumal|conjunction|especially since|Wir sollten früh losfahren, zumal es Stau geben könnte.=We should leave early, especially since there could be traffic.",
    "w|sofern|conjunction|provided that|Sofern nichts dazwischenkommt, treffen wir uns um neun.=Provided nothing comes up, we'll meet at nine.",
    "w|dennoch|conjunction|nevertheless|Die Lage ist schwierig. Dennoch bin ich optimistisch.=The situation is difficult. Nevertheless, I am optimistic.",
    "w|folglich|conjunction|consequently|Die Kosten stiegen, folglich sanken die Gewinne.=Costs rose, consequently profits fell.",
    "w|einerseits|adv|on the one hand|Einerseits verstehe ich das Problem, andererseits sehe ich keine Lösung.=On the one hand I understand the problem, on the other I see no solution.",
    "w|vermeintlich|adv|supposedly, ostensibly|Der vermeintliche Vorteil erwies sich als Nachteil.=The supposed advantage turned out to be a disadvantage.",
    "w|weitgehend|adv|largely, to a great extent|Das Problem ist weitgehend gelöst.=The problem is largely solved.",
    "w|zunehmend|adv|increasingly|Die Nachfrage steigt zunehmend.=Demand is increasingly rising.",
  ]);
  g('B2','argument-b2',[
    "n|Annahme|die|die Annahmen|assumption|Diese Annahme lässt sich nicht belegen.=This assumption cannot be substantiated.",
    "n|Widerspruch|der|die Widersprüche|contradiction, objection|Sein Vorschlag stieß auf Widerspruch.=His proposal met with objection.|+id:v_widerspruch_b2",
    "n|Tendenz|die|die Tendenzen|tendency, trend|Es gibt eine klare Tendenz zu mehr Homeoffice.=There is a clear trend towards more remote work.",
    "v|befürworten|befürworte/befürwortest/befürwortet|hat befürwortet|to advocate, support|Viele Experten befürworten die Reform.=Many experts advocate the reform.",
    "v|kritisieren|kritisiere/kritisierst/kritisiert|hat kritisiert|to criticise|Der Bericht wurde scharf kritisiert.=The report was sharply criticised.",
    "v|widerlegen|widerlege/widerlegst/widerlegt|hat widerlegt|to refute, disprove|Die Studie widerlegt die alte Theorie.=The study refutes the old theory.",
  ]);
  g('B2','economy-technology',[
    "n|Wettbewerb|der|die Wettbewerbe|competition|Der Wettbewerb auf dem Markt ist groß.=Competition in the market is fierce.",
    "n|Nachfrage|die|—|demand|Die Nachfrage nach dem Produkt steigt.=Demand for the product is rising.",
    "n|Angebot|das|die Angebote|supply, offer|Angebot und Nachfrage bestimmen den Preis.=Supply and demand determine the price.",
    "n|Infrastruktur|die|die Infrastrukturen|infrastructure|Die digitale Infrastruktur muss ausgebaut werden.=Digital infrastructure needs to be expanded.",
    "v|investieren|investiere/investierst/investiert|hat investiert|to invest|Das Unternehmen investiert in neue Technologien.=The company is investing in new technologies.",
    "v|automatisieren|automatisiere/automatisierst/automatisiert|hat automatisiert|to automate|Viele Prozesse wurden automatisiert.=Many processes have been automated.",
  ]);

  /* ================= C1 — advanced academic/professional, nominal style ================= */
  g('C1','academic-c1',[
    "n|Erkenntnisgewinn|der|—|gain in knowledge/insight|Die Studie liefert einen echten Erkenntnisgewinn.=The study provides a genuine gain in insight.",
    "n|Fragestellung|die|die Fragestellungen|research question, issue|Die Fragestellung der Arbeit ist klar formuliert.=The research question of the paper is clearly formulated.",
    "n|Rahmenbedingung|die|die Rahmenbedingungen|framework condition|Die wirtschaftlichen Rahmenbedingungen haben sich verändert.=The economic framework conditions have changed.",
    "n|Zielsetzung|die|die Zielsetzungen|objective, goal|Die Zielsetzung des Projekts ist ambitioniert.=The project's objective is ambitious.",
    "v|thematisieren|thematisiere/thematisierst/thematisiert|hat thematisiert|to address, bring up (a topic)|Der Artikel thematisiert ein wichtiges gesellschaftliches Problem.=The article addresses an important social problem.",
    "v|veranschaulichen|veranschauliche/veranschaulichst/veranschaulicht|hat veranschaulicht|to illustrate|Ein Beispiel soll das Konzept veranschaulichen.=An example is meant to illustrate the concept.",
    "v|resultieren|resultiere/resultierst/resultiert|hat resultiert|to result (from)|Der Erfolg resultiert aus jahrelanger Arbeit.=The success results from years of work.",
    "a|unumstritten||undisputed|Der Erfolg der Maßnahme ist unumstritten.=The success of the measure is undisputed.",
  ]);
  g('C1','formal-connectors',[
    "w|infolgedessen|adv|as a result, consequently|Die Preise stiegen, infolgedessen sank der Absatz.=Prices rose; as a result, sales fell.",
    "w|nichtsdestotrotz|adv|nonetheless|Die Lage war schwierig, nichtsdestotrotz erreichten wir unser Ziel.=The situation was difficult, nonetheless we reached our goal.",
    "w|geschweige denn|conjunction|let alone|Ich habe keine Zeit zu kochen, geschweige denn zu backen.=I have no time to cook, let alone bake.",
    "w|ungeachtet|preposition|regardless of, despite|Ungeachtet der Kritik hielt sie an ihrem Plan fest.=Regardless of the criticism, she stuck to her plan.",
    "w|mithin|adv|therefore, thus (formal)|Die Bedingungen waren erfüllt, mithin wurde der Vertrag geschlossen.=The conditions were met, therefore the contract was concluded.",
  ]);
  g('C1','idiomatic-c1',[
    "p|auf der Hand liegen|to be obvious|Die Lösung liegt eigentlich auf der Hand.=The solution is actually obvious.",
    "p|einen Kompromiss eingehen|to reach a compromise|Beide Seiten mussten einen Kompromiss eingehen.=Both sides had to reach a compromise.",
    "p|etwas in Kauf nehmen|to accept something as a trade-off|Dafür muss man längere Wartezeiten in Kauf nehmen.=For that, one has to accept longer waiting times.",
  ]);

  /* ================= C2 — nuance, register, stylistic precision ================= */
  g('C2','nuance-c2',[
    "n|Feinheit|die|die Feinheiten|nuance, subtlety|Man muss die Feinheiten der Sprache verstehen.=One has to understand the nuances of the language.",
    "n|Zwiespalt|der|—|inner conflict, dilemma|Sie befand sich in einem echten Zwiespalt.=She found herself in a genuine dilemma.",
    "v|nuancieren|nuanciere/nuancierst/nuanciert|hat nuanciert|to nuance, qualify|Er nuancierte seine ursprüngliche Aussage.=He qualified his original statement.",
    "v|suggerieren|suggeriere/suggerierst/suggeriert|hat suggeriert|to suggest, imply|Die Überschrift suggeriert etwas anderes als der Text.=The headline suggests something different from the text.",
    "a|nuanciert||nuanced|Seine Argumentation war sehr nuanciert.=His argumentation was very nuanced.",
    "a|unterschwellig||subliminal, underlying|Es gab eine unterschwellige Spannung im Raum.=There was an underlying tension in the room.",
  ]);
  g('C2','register-c2',[
    "w|mitnichten|adv|by no means (formal/literary)|Das ist mitnichten der Fall.=That is by no means the case.",
    "w|zuweilen|adv|occasionally, at times (formal)|Zuweilen zweifelte sie an ihrer Entscheidung.=At times she doubted her decision.",
    "w|gleichwohl|adv|nevertheless (formal)|Die Kritik war berechtigt, gleichwohl änderte sich nichts.=The criticism was justified; nevertheless, nothing changed.",
    "w|es sei denn|conjunction|unless (formal)|Ich komme mit, es sei denn, es regnet.=I'll come along, unless it rains.",
    "v|anmuten|mute an/mutest an/mutet an|hat angemutet|to seem, appear (literary)|Der Plan mutet auf den ersten Blick unrealistisch an.=The plan seems unrealistic at first glance.",
  ]);
  g('C2','idiomatic-c2',[
    "p|sich etwas zunutze machen|to make good use of something|Sie machte sich die Gelegenheit zunutze.=She made good use of the opportunity.",
    "p|im Zuge (+Gen.)|in the course of|Im Zuge der Reform wurden viele Regeln geändert.=In the course of the reform, many rules were changed.",
    "p|einer Sache Rechnung tragen|to take something into account|Die Planung trägt den neuen Vorschriften Rechnung.=The planning takes the new regulations into account.",
  ]);

  /* ================= cross-level functional words (spec §43) ================= */
  g('B2','modal-particles',[
    "w|ohnehin|adv|anyway, in any case|Ich wollte ohnehin früher gehen.=I wanted to leave earlier anyway.",
    "w|immerhin|adv|at least, after all|Immerhin haben wir es versucht.=At least we tried.",
  ]);
  g('C1','modal-particles-c1',[
    "w|freilich|adv|admittedly, of course (formal)|Freilich gibt es auch Nachteile.=Admittedly, there are also disadvantages.",
    "w|gewissermaßen|adv|in a way, so to speak|Er ist gewissermaßen für das Projekt verantwortlich.=He is, in a way, responsible for the project.",
  ]);

  return out;
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = { VOCAB_EXPANSION2 }; }

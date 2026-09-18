/* ============================================================
   CURRICULUM — B1 (spec §12)
   B1 is the "independent user" threshold: relative clauses,
   passive, Konjunktiv II, genitive, and real bureaucratic /
   professional survival German. ~14 lessons across 5 units.
   ============================================================ */
const CURRICULUM_B1 = (() => {
  const D = (typeof DSL !== 'undefined') ? DSL : require('../core/dsl.js');

return D.buildLevel('B1', [
{
  title:'Menschen und Dinge beschreiben', theme:'Describing people and things precisely',
  goal:'Add detail to any noun with a relative clause.',
  canDo:['Describe a person or thing with extra detail','Understand relative clauses in texts','Write more precise sentences'],
  lessons:[
  {
    title:'Relative Clauses (Nominative & Accusative)', topic:'grammar',
    goal:'Build relative clauses to add information about a noun.',
    why:'Without relative clauses every description needs two separate sentences; with them your German finally sounds connected.',
    intro:'A relative clause takes its GENDER and NUMBER from the noun it describes, but its CASE from its own role inside the clause.',
    vocab:['v_kollege','v_nachbar','v_erfahrung'],
    grammar:'g_relativsatz', time:20, skills:['grammar','writing'],
    teach:[
      ['Nominative relative pronoun','When the pronoun is the subject of its own clause: Das ist der Kollege, der mir geholfen hat.'],
      ['Accusative relative pronoun','When the pronoun is the object of its own clause: Die Wohnung, die wir gemietet haben, ist klein.'],
      ['Punctuation and position','Always separated by commas; the conjugated verb of the relative clause goes to the end.'],
    ],
    commonMistake:'Taking the case from the main clause instead of the relative clause\u2019s own role: "der Mann, der ich gesehen habe" should be "den ich gesehen habe" because ich is the subject and der Mann is the object of "sehen".',
    prog:['Building a relative clause: „der Kollege“',
      ['der Kollege','the colleague','A noun on its own.'],
      ['der Kollege, der mir geholfen hat','the colleague who helped me','Nominative relative pronoun: der is the subject of "helfen".'],
      ['Das ist der Kollege, der mir gestern geholfen hat.','That is the colleague who helped me yesterday.','A complete sentence with a time expression inside the relative clause.'],
    ],
    ex:[
      'mcq|word-order|Complete: "Das ist die Frau, ___ mir geholfen hat."|die;der;den;deren|die|die Frau is feminine and the subject of "helfen" → nominative die.',
      'mcq|word-order|Complete: "Die Wohnung, ___ wir gemietet haben, ist klein."|die;der;den;deren|die|Object of "mieten", feminine → accusative die (identical to nominative for feminine).',
      'mcq|word-order|Complete: "Der Mann, ___ ich gesehen habe, wohnt hier."|der;den;dem;dessen|den|Object of "sehen", masculine → accusative den.',
      'build|word-order|Put in order: "That is the colleague who helped me."|Das ist der Kollege, der mir geholfen hat.|Comma before the relative clause, verb at the end.',
      'correct|word-order|Correct this sentence: Das ist der Mann, der ich gesehen habe.|Das ist der Mann, den ich gesehen habe.|The pronoun is the object of "sehen", so it needs the accusative.',
    ],
    realLife:{situation:'Describing a colleague to someone new at work.', task:'Give two sentences, each with a relative clause.'},
    summary:['Case comes from the role inside the relative clause','Comma before the clause, verb at the end','Nominative = subject, accusative = object'],
  },
  {
    title:'Relative Clauses (Dative & Genitive, with Prepositions)', topic:'grammar',
    goal:'Extend relative clauses to the dative and genitive, including with a preposition.',
    why:'Dative and genitive relative clauses appear constantly in written German — job ads, contracts, news.',
    intro:'A preposition inside a relative clause moves together with its pronoun to the front of the clause.',
    vocab:['v_firma','v_vertrag','v_nachbar'],
    grammar:'g_relativsatz', time:18, skills:['grammar','reading'],
    teach:[
      ['Dative relative pronoun','dem, der, dem, denen (plural). Der Kollege, dem ich geholfen habe, ist neu.'],
      ['Genitive relative pronoun','dessen (m./n.), deren (f./pl.): der Mann, dessen Auto kaputt ist.'],
      ['Preposition + pronoun','die Firma, bei der ich arbeite. der Kurs, an dem ich teilnehme.'],
    ],
    commonMistake:'Leaving the preposition behind: "die Firma, die ich arbeite bei" — German always fronts the preposition together with the pronoun.',
    ex:[
      'mcq|word-order|Complete: "Der Kurs, an ___ ich teilnehme, ist gut."|den;dem;der;dessen|dem|an takes the dative; der Kurs is masculine → dem.',
      'mcq|word-order|Complete: "Das ist der Mann, ___ Auto kaputt ist."|der;den;dessen;deren|dessen|Genitive, masculine: dessen.',
      'fill|word-order|Complete: "Die Firma, bei ___ ich arbeite, ist klein." (die Firma)|der|bei takes the dative; die Firma → der.',
      'correct|word-order|Correct this sentence: Die Kollegin, ich mit arbeite, ist neu.|Die Kollegin, mit der ich arbeite, ist neu.|The preposition moves to the front together with the pronoun.',
    ],
    realLife:{situation:'Writing a short text about your workplace.', task:'Use one dative and one genitive relative clause.'},
    summary:['Dative: dem/der/dem/denen','Genitive: dessen/deren','A preposition moves with its pronoun'],
  },
  ]},
{
  title:'Die Passivkonstruktion', theme:'The passive voice',
  goal:'Describe processes without naming who does them.',
  canDo:['Understand official notices and instructions','Describe a process','Use the passive with modals'],
  lessons:[
  {
    title:'The Passive: Präsens and Präteritum', topic:'grammar',
    goal:'Form and understand the passive in the present and simple past.',
    why:'Official German — forms, instructions, news — uses the passive constantly, precisely because the actor does not matter.',
    intro:'The passive is built with werden + Partizip II, with werden carrying the tense.',
    vocab:['v_antrag','v_bearbeiten','v_formular'],
    grammar:'g_passiv', time:18, skills:['grammar','reading'],
    teach:[
      ['Present passive','werden (conjugated) + Partizip II: Der Antrag wird geprüft.'],
      ['Past passive','wurde + Partizip II: Der Antrag wurde letzte Woche geprüft.'],
      ['Naming the agent','von + Dativ for a person: Der Brief wurde von der Chefin unterschrieben. durch + Akkusativ for a cause or means.'],
    ],
    commonMistake:'Confusing werden (passive auxiliary) with werden (to become): "Ich werde Lehrer" (I am becoming a teacher) has no participle and is not passive.',
    ex:[
      'mcq|passiv|Complete: "Das Formular ___ jetzt bearbeitet."|wird;wurde;ist;hat|wird|Present passive: werden + Partizip II.',
      'mcq|passiv|Complete: "Der Vertrag ___ letzte Woche unterschrieben."|wird;wurde;ist;war|wurde|Past passive uses wurde.',
      'fill|passiv|Rewrite as passive: "Man prüft den Antrag." → Der Antrag ___ geprüft.|wird|Active "man prüft" becomes passive "wird geprüft".',
      'mcq|passiv|Which phrase names the person who performed the action?|durch;von;bei;mit|von|von + Dativ names the human agent in a passive sentence.',
    ],
    realLife:{situation:'Reading a notice at a government office.', task:'Understand and explain in your own words what process is being described.'},
    summary:['werden + Partizip II','wurde for the past','von + Dativ for the agent'],
  },
  {
    title:'The Passive with Modal Verbs', topic:'grammar',
    goal:'Combine the passive with müssen, können and sollen.',
    why:'Instructions in official German are almost always "must be done", not "you must do it".',
    intro:'A modal passive has three parts: the modal (conjugated), the participle, and werden — both non-finite parts stand at the end.',
    vocab:['v_formular','v_frist','v_unterschrift'],
    grammar:'g_passiv', time:16, skills:['grammar','reading','writing'],
    teach:[
      ['Structure','Modal (Pos. 2) + … + Partizip II + werden (end): Das Formular muss bis Freitag ausgefüllt werden.'],
      ['Why German prefers this','It keeps the focus on the task, not the person — appropriate for rules that apply to everyone.'],
      ['The everyday alternative','man + active verb is common in speech: Man muss das Formular ausfüllen. Both mean the same thing; the passive is more formal.'],
    ],
    commonMistake:'Putting werden before the participle: "muss werden ausgefüllt" — the correct order is participle then werden.',
    ex:[
      'mcq|passiv|Complete: "Die Unterlagen müssen bis Montag ___ ___."|eingereicht werden;werden eingereicht;eingereicht sein werden;sein eingereicht|eingereicht werden|Participle first, then werden, at the very end.',
      'fill|passiv|Rewrite with a modal passive: "Man muss das Formular ausfüllen." → Das Formular ___ ___ ___.|muss ausgefüllt werden|Modal + participle + werden.',
      'mcq|passiv|Which sentence means the same as "Man muss die Frist einhalten"?|Die Frist muss eingehalten werden.;Die Frist wird eingehalten müssen.;Die Frist ist einhalten müssen.;Die Frist einhält werden müssen.|Die Frist muss eingehalten werden.|Modal passive: correct order.',
    ],
    realLife:{situation:'A notice lists three requirements for a visa application.', task:'Rephrase them using modal passives.'},
    summary:['Modal (Pos.2) + Partizip II + werden (end)','man + active is the everyday equivalent','Used for rules and instructions'],
  },
  ]},
{
  title:'Höflich und hypothetisch', theme:'Politeness and hypotheticals',
  goal:'Make polite requests and talk about unreal situations.',
  canDo:['Make a polite request','Give advice','Talk about hypothetical situations'],
  lessons:[
  {
    title:'Konjunktiv II: Polite Requests & Advice', topic:'grammar',
    goal:'Use würde, hätte, könnte and wäre for politeness and advice.',
    why:'Sie-level directness ("Geben Sie mir …") can sound rude; Konjunktiv II is what makes German requests sound polite.',
    intro:'Most verbs form Konjunktiv II with würde + infinitive; haben, sein and the modals have their own, more natural forms.',
    vocab:['v_vorschlag','v_meinung'],
    grammar:'g_konjunktiv2', time:18, skills:['grammar','speaking'],
    teach:[
      ['Polite requests','Könnten Sie mir helfen? Hätten Sie kurz Zeit? Dürfte ich etwas fragen?'],
      ['Advice','An deiner Stelle würde ich mit dem Chef sprechen. Ich würde das nicht machen.'],
      ['würde vs the own forms','würde + infinitive works for any verb, but haben/sein/modals almost always use their own form (hätte, wäre, könnte) instead, because it sounds more natural.'],
    ],
    commonMistake:'"Ich würde haben Zeit" — haben has its own Konjunktiv II form: Ich hätte Zeit.',
    ex:[
      'mcq|konjunktiv|Which is the most natural polite request?|Geben Sie mir das Formular.;Könnten Sie mir das Formular geben?;Sie geben mir das Formular?;Ich will das Formular.|Könnten Sie mir das Formular geben?|könnten softens the request into Konjunktiv II.',
      'mcq|konjunktiv|Complete: "___ Sie kurz Zeit?"|Haben;Hätten;Würden haben;Hatten|Hätten|haben has its own Konjunktiv II form: hätte/hätten.',
      'fill|konjunktiv|Give advice: "In your place, I would call the landlord."|an deiner stelle würde ich den vermieter anrufen|würde + infinitive is the general Konjunktiv II pattern.',
      'mcq|konjunktiv|Which sentence is more natural?|Ich würde gern mehr Zeit haben.;Ich hätte gern mehr Zeit.;Both are equally natural.;Neither is correct.|Both are equally natural.|Both are used; hätte gern is very slightly more idiomatic for wishes.',
    ],
    realLife:{situation:'Asking a stranger for a small favour.', task:'Make two different polite requests using Konjunktiv II.'},
    summary:['würde + Infinitiv for most verbs','hätte/wäre/könnte for haben/sein/modals','Konjunktiv II softens requests and advice'],
  },
  {
    title:'Konjunktiv II: Unreal Conditions', topic:'grammar',
    goal:'Talk about situations that are not real: wishes and hypotheticals.',
    why:'"If I had more time…", "If I were you…" — these are everyday thoughts, and they need Konjunktiv II, not the normal present tense.',
    intro:'An unreal wenn-clause pairs a Konjunktiv II condition with a Konjunktiv II consequence.',
    vocab:['v_wunsch','v_moeglichkeit'],
    grammar:'g_konjunktiv2', time:16, skills:['grammar','writing'],
    teach:[
      ['Present unreal conditions','Wenn ich mehr Zeit hätte, würde ich mehr lesen. Both clauses use Konjunktiv II.'],
      ['Past unreal conditions','hätte/wäre + Partizip II in both clauses: Wenn ich es gewusst hätte, hätte ich dir geholfen.'],
      ['Wishes','Ich wünschte, ich hätte mehr Zeit. Wenn ich doch nur mehr Zeit hätte!'],
    ],
    commonMistake:'Mixing a real present tense into an unreal condition: "Wenn ich mehr Zeit habe, würde ich mehr lesen" mixes real and unreal — both sides need Konjunktiv II.',
    ex:[
      'mcq|konjunktiv|Complete: "Wenn ich mehr Geld ___, würde ich reisen."|habe;hätte;hatte;haben werde|hätte|An unreal condition needs Konjunktiv II throughout.',
      'fill|konjunktiv|Complete the wish: "Ich wünschte, ich ___ mehr Zeit." (haben)|hätte|hätte is the Konjunktiv II form of haben.',
      'mcq|konjunktiv|Which sentence describes an unreal past situation?|Wenn ich es weiß, sage ich es dir.;Wenn ich es gewusst hätte, hätte ich es dir gesagt.;Wenn ich es wusste, sagte ich es dir.;Ich habe es gewusst und gesagt.|Wenn ich es gewusst hätte, hätte ich es dir gesagt.|Past unreal conditions use hätte + Partizip II in both clauses.',
      'correct|konjunktiv|Correct this sentence: Wenn ich Zeit habe, würde ich kommen.|Wenn ich Zeit hätte, würde ich kommen.|Both clauses of an unreal condition need Konjunktiv II.',
    ],
    realLife:{situation:'Daydreaming with a friend about a different life.', task:'Say two unreal wishes and one unreal condition.'},
    summary:['Both clauses use Konjunktiv II','Past unreal: hätte/wäre + Partizip II','Ich wünschte, … for wishes'],
  },
  ]},
{
  title:'Verbindungen und Meinungen', theme:'Connecting ideas and arguing a point',
  goal:'Use B1 connectors to structure an opinion.',
  canDo:['Structure a short argument','Use obwohl/trotzdem correctly','Express agreement and disagreement'],
  lessons:[
  {
    title:'Connectors: obwohl, trotzdem, deshalb', topic:'grammar',
    goal:'Choose the right connector type and its word order.',
    why:'obwohl and trotzdem express the same contrast, but one is a subordinator and one a conjunctional adverb — mixing up the word order is a very visible B1 mistake.',
    intro:'German connectors fall into three groups, and the group — not the meaning — decides the word order.',
    vocab:['v_zusammenhang','v_folge'],
    grammar:'g_konnektoren_b1', time:18, skills:['grammar','writing'],
    teach:[
      ['Subordinators (verb last)','obwohl, weil, damit, falls, seitdem: Obwohl es regnet, gehe ich raus.'],
      ['Conjunctional adverbs (position one, verb follows)','trotzdem, deshalb, deswegen, außerdem: Es regnet. Trotzdem gehe ich raus.'],
      ['Coordinators (no change)','und, aber, oder, denn, sondern.'],
    ],
    commonMistake:'Treating trotzdem like a subordinator: "…, trotzdem ich gehe raus" is wrong; trotzdem is a conjunctional adverb, so the verb follows it directly: "trotzdem gehe ich raus".',
    ex:[
      'mcq|word-order|Which sentence is correct?|Obwohl es regnet, ich gehe raus.;Obwohl es regnet, gehe ich raus.;Es regnet, obwohl gehe ich raus.;Obwohl regnet es, gehe ich raus.|Obwohl es regnet, gehe ich raus.|obwohl is a subordinator: verb last in its own clause, then main verb second.',
      'mcq|word-order|Which sentence is correct?|Es regnet. Trotzdem ich gehe raus.;Es regnet. Trotzdem gehe ich raus.;Es regnet, trotzdem dass ich gehe raus.;Es regnet trotzdem ich raus gehe.|Es regnet. Trotzdem gehe ich raus.|trotzdem occupies position one; the verb follows immediately.',
      'fill|word-order|Join with deshalb: "Es war spät." + "Ich bin mit dem Taxi gefahren."|es war spät deshalb bin ich mit dem taxi gefahren|deshalb takes position one, so the verb follows directly.',
      'correct|word-order|Correct this sentence: Obwohl er müde war, er hat weitergearbeitet.|Obwohl er müde war, hat er weitergearbeitet.|After the fronted obwohl-clause, the main verb comes immediately.',
    ],
    realLife:{situation:'Explaining a decision that seems surprising.', task:'Use obwohl and trotzdem in the same short paragraph.'},
    summary:['obwohl: subordinator, verb last','trotzdem/deshalb: conjunctional adverb, position one','The group decides the word order, not the meaning'],
  },
  {
    title:'Agreeing, Disagreeing and Giving Opinions', topic:'grammar',
    goal:'Express and justify an opinion in a discussion.',
    why:'B1 speaking exams and real discussions both require you to hold and defend a position politely.',
    intro:'German has graded ways to agree and disagree — from enthusiastic agreement to polite but clear disagreement.',
    vocab:['v_meinung','v_grund','v_vorschlag','v_diskutieren'],
    grammar:'g_wordorder', time:16, skills:['speaking','conversation'],
    teach:[
      ['Giving an opinion','Meiner Meinung nach … / Ich finde, dass … / Ich bin der Ansicht, dass …'],
      ['Agreeing','Da stimme ich dir/Ihnen zu. / Genau, das sehe ich auch so. / Das finde ich auch.'],
      ['Disagreeing politely','Das sehe ich anders. / Ich bin nicht ganz Ihrer Meinung. / Einerseits …, andererseits …'],
    ],
    commonMistake:'Disagreeing too bluntly ("Das ist falsch") in a formal discussion — German politeness conventions favour a softening phrase first.',
    ex:[
      'mcq|conversation|Which phrase politely disagrees?|Das ist falsch.;Ich bin nicht ganz Ihrer Meinung.;Nein!;Sie haben unrecht.|Ich bin nicht ganz Ihrer Meinung.|This softens the disagreement while remaining clear.',
      'fill|conversation|Give an opinion using "meiner Meinung nach".|meiner meinung nach ist das eine gute idee|meiner Meinung nach + comma is not required; the phrase itself introduces the opinion.',
      'mcq|conversation|Which structure signals "on the one hand … on the other hand"?|einerseits … andererseits;erstens … zweitens;zuerst … danach;entweder … oder|einerseits … andererseits|This is the standard structure for weighing two sides.',
    ],
    realLife:{situation:'A discussion about working from home.', task:'State your opinion, agree with one point, and disagree with another.'},
    summary:['Meiner Meinung nach / Ich finde, dass','Da stimme ich zu / Das sehe ich anders','einerseits … andererseits structures a balanced view'],
  },
  ]},
{
  title:'B1-Vorbereitung', theme:'B1 exam preparation and review',
  goal:'Consolidate B1 grammar and practise exam-style tasks.',
  canDo:['Handle a Goethe/telc-style B1 speaking task','Write a structured opinion text','Pass a B1 self-check'],
  lessons:[
  {
    title:'The Genitive & Formal Writing', topic:'grammar',
    goal:'Recognise and use the genitive in formal contexts.',
    why:'The genitive is rare in speech but common in official writing, and B1 exams test both recognition and basic production.',
    intro:'The genitive marks possession and follows a set of prepositions used mainly in formal register.',
    vocab:['v_grund','v_vertrag'],
    grammar:'g_genitiv', time:16, skills:['grammar','reading','writing'],
    teach:[
      ['Forms','Masculine/neuter: des Mannes, des Kindes (noun adds -s/-es). Feminine/plural: der Frau, der Kinder.'],
      ['Genitive prepositions','wegen, während, trotz, aufgrund, innerhalb, außerhalb, statt.'],
      ['The spoken alternative','von + Dativ replaces the genitive in speech: das Auto von meinem Bruder instead of das Auto meines Bruders.'],
    ],
    commonMistake:'Using an apostrophe as in English: "Annas\u2019 Auto" — German genitive names take -s with no apostrophe: Annas Auto.',
    ex:[
      'mcq|genitiv|Complete: "Das ist das Büro ___ Chefs."|der;des;dem;den|des|Masculine genitive: der Chef → des Chefs.',
      'mcq|genitiv|Complete: "___ des Regens sind wir gelaufen."|Wegen;Trotz;Während;Aufgrund|Trotz|trotz = despite, takes the genitive.',
      'fill|genitiv|Rewrite in speech-style: "das Auto meines Bruders" → das Auto ___ ___ Bruder.|von meinem|von + Dativ replaces the genitive in speech.',
    ],
    realLife:{situation:'Reading a short official notice.', task:'Identify the genitive phrases and restate them with von + Dativ.'},
    summary:['des/der + noun (+s/es)','wegen, während, trotz, aufgrund + Genitiv','von + Dativ as the spoken alternative'],
  },
  {
    title:'B1 Review & Readiness Check', topic:'grammar',
    goal:'Confirm relative clauses, passive, Konjunktiv II and connectors are secure before B2.',
    why:'B2 assumes fluent, largely automatic control of B1 structures in both speech and writing.',
    intro:'A mixed review across every B1 topic.',
    vocab:[], grammar:'g_relativsatz', time:22, skills:['grammar','writing','speaking'], difficulty:'challenging',
    teach:[
      ['What B1 really means','You can hold your own in most everyday and some abstract situations, justify opinions, and produce a structured short text.'],
      ['The four load-bearing structures','Relative clauses with the correct case; the passive (plain and with modals); Konjunktiv II for politeness and hypotheticals; the correct word order after each connector type.'],
    ],
    commonMistake:'Treating B1 as "finished" grammar. B2 will add nuance to all four structures above rather than new ones — so they must already be fluent.',
    ex:[
      'mcq|word-order|Complete: "Die Kollegin, ___ mir geholfen hat, heißt Lena."|die;der;den;deren|die|Subject of "helfen", feminine → nominative die.',
      'mcq|passiv|Complete: "Das Problem muss schnell ___ ___."|gelöst werden;werden gelöst;gelöst sein;sein gelöst|gelöst werden|Modal passive: participle, then werden, at the end.',
      'mcq|konjunktiv|Complete: "___ Sie mir kurz helfen?"|Können;Könnten;Konnten;Werden|Könnten|Konjunktiv II softens the request.',
      'mcq|word-order|Which sentence is correct?|Obwohl es spät war, wir sind geblieben.;Obwohl es spät war, sind wir geblieben.;Es war obwohl spät, sind wir geblieben.;Obwohl spät es war, sind wir geblieben.|Obwohl es spät war, sind wir geblieben.|Fronted subordinate clause, main verb follows directly.',
      'fill|genitiv|Complete: "___ des schlechten Wetters sind wir zu Hause geblieben." (trotz)|Trotz|trotz + Genitiv.',
    ],
    realLife:{situation:'A B1 speaking exam task about a controversial topic.', task:'Structure a two-minute opinion with a relative clause, a connector and Konjunktiv II.'},
    summary:['Relative clause case = role inside the clause','Passive: werden/wurde + Partizip II','Konjunktiv II for politeness and hypotheticals','Connector group decides word order'],
  },
  ]},
]);
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = { CURRICULUM_B1 }; }

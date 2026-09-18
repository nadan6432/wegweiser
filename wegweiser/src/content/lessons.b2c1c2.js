/* ============================================================
   CURRICULUM — B2 / C1 / C2 (spec §13, §14, §15)
   Upper levels shift from "new grammar" to register, argument
   structure, nominal style and stylistic control. Fewer, denser
   lessons — each is meant to take real study time.
   ============================================================ */
const CURRICULUM_B2C1C2 = (() => {
  const D = (typeof DSL !== 'undefined') ? DSL : require('../core/dsl.js');

/* ================================================================
   B2
   ================================================================ */
const B2 = D.buildLevel('B2', [
{
  title:'Argumentieren', theme:'Building an argument',
  goal:'Structure and defend a position with precision.',
  canDo:['Build a structured argument','Concede a point without losing it','Use extended passive forms'],
  lessons:[
  {
    title:'Structuring an Argument', topic:'argument',
    goal:'Build a claim, support it with evidence, and pre-empt an objection.',
    why:'B2 speaking and writing tasks are judged on structure as much as grammar.',
    intro:'A B2 argument has a recognisable shape: thesis, evidence, concession, conclusion.',
    vocab:['v_these','v_argument','v_beleg','v_einwand'],
    grammar:'g_konnektoren_b2', time:20, skills:['writing','speaking'],
    teach:[
      ['The shape','These (claim) → Beleg (evidence) → Einwand + Entkräftung (objection and rebuttal) → Fazit (conclusion).'],
      ['zwar … aber for concession','Das Angebot ist zwar teuer, aber von hoher Qualität — concede a point without abandoning your position.'],
      ['je … desto for correlation','Je länger man wartet, desto teurer wird es. Note: Nebensatz order in the je-clause, verb straight after desto.'],
    ],
    commonMistake:'Getting the desto-clause word order wrong: "je … desto man lernt schneller" instead of "je … desto schneller lernt man".',
    ex:[
      'mcq|word-order|Complete: "Je mehr man übt, ___ besser wird man."|dann;desto;also;damit|desto|je … desto is the fixed correlative pair.',
      'mcq|argument|Which phrase introduces a concession?|Außerdem;Zwar … aber;Deshalb;Erstens|Zwar … aber|zwar concedes a point before aber restates the main position.',
      'build|word-order|Put in order: "The more you read, the faster you learn."|Je mehr man liest, desto schneller lernt man.|Nebensatz order after je, then desto + comparative + verb.',
      'fill|argument|Introduce evidence: "Studies show that …"|studien zeigen, dass|A standard academic-register opener for evidence.',
    ],
    realLife:{situation:'A debate about remote work.', task:'State a thesis, concede one counterpoint with zwar…aber, and conclude.'},
    summary:['These → Beleg → Einwand → Fazit','zwar … aber concedes without surrendering','je … desto for correlation'],
  },
  {
    title:'Extended Passive & Alternatives', topic:'grammar',
    goal:'Use the Zustandspassiv and passive alternatives fluently.',
    why:'Native writers vary passive constructions; using only "wird … gemacht" sounds repetitive and slightly foreign.',
    intro:'Beyond the basic passive, German has a process/state distinction and several active alternatives.',
    vocab:['v_massnahme','v_ergebnis'],
    grammar:'g_passiv_erweitert', time:18, skills:['grammar','writing'],
    teach:[
      ['Process vs state','Vorgangspassiv (the action happening): Der Vertrag wird unterschrieben. Zustandspassiv (the resulting state): Der Vertrag ist unterschrieben.'],
      ['sich lassen + Infinitiv','Das Problem lässt sich lösen. = Das Problem kann gelöst werden, but lighter in style.'],
      ['sein + zu + Infinitiv','Der Antrag ist bis Freitag einzureichen. A formal alternative to müssen + passive.'],
    ],
    commonMistake:'Using Zustandspassiv where the ongoing action is meant: "Der Vertrag ist unterschrieben" describes a finished state, not the act of signing happening now.',
    ex:[
      'mcq|passiv|Which sentence describes an ongoing action?|Der Laden ist geschlossen.;Der Laden wird geschlossen.;Der Laden war geschlossen.;Der Laden ist zu.|Der Laden wird geschlossen.|Vorgangspassiv describes the action happening now.',
      'mcq|passiv|What does "Das Problem lässt sich lösen" mean?|The problem must be solved.;The problem can be solved.;The problem is being solved.;The problem was solved.|The problem can be solved.|sich lassen + Infinitiv = can be done, a lighter alternative to können + passive.',
      'fill|passiv|Rewrite formally: "Man muss den Antrag bis Freitag einreichen." → Der Antrag ___ bis Freitag ___.|ist einzureichen|sein + zu + Infinitiv is a formal alternative to the modal passive.',
    ],
    realLife:{situation:'Writing a formal notice about a deadline.', task:'Use sein + zu + Infinitiv and sich lassen in two different sentences.'},
    summary:['Vorgangspassiv = happening; Zustandspassiv = result','sich lassen + Infinitiv = can be done','sein + zu + Infinitiv = formal must-be-done'],
  },
  ]},
{
  title:'Berufliches Deutsch', theme:'Professional German',
  goal:'Operate in meetings, emails and reports.',
  canDo:['Write a professional email','Contribute to a meeting','Summarise a report'],
  lessons:[
  {
    title:'Professional Emails & Meetings', topic:'professional',
    goal:'Write structured professional correspondence and contribute to a meeting.',
    why:'B2 is the level at which German is expected to function at work, not just survive daily life.',
    intro:'Professional register replaces plain verbs with more precise, often nominal, alternatives.',
    vocab:['v_massnahme','v_zusammenarbeit','v_herausforderung','v_umsetzen','v_durchfuehren'],
    grammar:'g_nominalisierung', time:20, skills:['writing','speaking'],
    teach:[
      ['Structuring a professional email','Betreff (subject) → Anrede → Kontext → Anliegen → nächste Schritte → Grußformel.'],
      ['Meeting phrases','Ich möchte kurz auf X eingehen. / Um auf Ihren Punkt zurückzukommen … / Lassen Sie uns das festhalten.'],
      ['Nominal style in reports','wegen der gestiegenen Kosten rather than weil die Kosten gestiegen sind — more compact and more formal.'],
    ],
    commonMistake:'Writing a professional email with the structure and directness of a text message — B2 register requires the fuller frame even for a short request.',
    ex:[
      'mcq|professional|Which phrase politely returns to an earlier point in a meeting?|Wie gesagt …;Um auf Ihren Punkt zurückzukommen …;Ich weiß nicht.;Egal.|Um auf Ihren Punkt zurückzukommen …|A standard, polite way to reopen a topic.',
      'fill|professional|Rewrite in nominal style: "weil die Kosten gestiegen sind" → wegen ___ ___ Kosten.|der gestiegenen|Nominal style: wegen + Genitiv + participial adjective.',
      'mcq|professional|Which element usually comes right after the greeting in a professional email?|Grußformel;Kontext;Betreff;Anlage|Kontext|After the greeting, context is given before the actual request.',
    ],
    realLife:{situation:'Writing to a colleague about a delayed project.', task:'Write a five-line professional email: context, problem, request, next step, closing.'},
    summary:['Betreff → Anrede → Kontext → Anliegen → Schritte → Gruß','Meeting phrases soften and structure contributions','Nominal style raises register'],
  },
  ]},
{
  title:'Medien und Gesellschaft', theme:'Media and society as discourse',
  goal:'Discuss abstract social and media topics with precision.',
  canDo:['Discuss a societal topic','Summarise a media report','Use subjective modal verbs'],
  lessons:[
  {
    title:'Modal Verbs with Subjective Meaning', topic:'grammar',
    goal:'Express degrees of certainty and reported claims with modal verbs.',
    why:'This is one of the clearest markers separating B1 from B2 German: the same modal, a completely different function.',
    intro:'Beyond ability and obligation, German modal verbs express how sure the speaker is, or what someone else claims.',
    vocab:['v_auswirkung','v_anteil'],
    grammar:'g_modalverben_subjektiv', time:18, skills:['grammar','reading'],
    teach:[
      ['müssen = near certainty','Er muss zu Hause sein — das Licht brennt. (must, in the sense of "it has to be the case")'],
      ['dürfte = polite probability','Das dürfte stimmen. (probably true)'],
      ['sollen = reported, second-hand','Der Film soll sehr gut sein. (they say the film is very good — the speaker has not seen it)'],
      ['wollen = a claim, said sceptically','Er will nichts gewusst haben. (he claims he knew nothing — the speaker is doubtful)'],
    ],
    commonMistake:'Reading "Der Film soll gut sein" as an instruction ("the film should be good") rather than a report of what others say.',
    ex:[
      'mcq|modal-verbs|What does "Das dürfte stimmen" mean?|You are allowed to say that.;That is probably true.;That must be true.;That is forbidden.|That is probably true.|dürfte here expresses probability, not permission.',
      'mcq|modal-verbs|What does "Er will nichts gewusst haben" suggest?|The speaker believes him.;The speaker is sceptical of his claim.;He wants to know something.;He is asking a question.|The speaker is sceptical of his claim.|Subjective wollen reports a claim the speaker doubts.',
      'fill|modal-verbs|Express near certainty: "He must be at home — the light is on." (subjective müssen)|er muss zu hause sein|müssen here expresses logical necessity/certainty, not obligation.',
    ],
    realLife:{situation:'Discussing a rumour about a colleague.', task:'Use sollen and dürfte to report it without stating it as fact.'},
    summary:['müssen = near certainty','sollen = reported claim','wollen = sceptical self-claim'],
  },
  {
    title:'B2 Review & Readiness Check', topic:'grammar',
    goal:'Confirm argument structure, extended passive and subjective modals are secure.',
    why:'C1 assumes fluent structural and stylistic control — this check verifies it honestly.',
    intro:'A mixed B2 review.',
    vocab:[], grammar:'g_konnektoren_b2', time:20, skills:['grammar','writing'], difficulty:'challenging',
    teach:[
      ['What B2 really means','You can argue a position with structure, operate professionally in German, and understand nuanced spoken and written German on abstract topics.'],
    ],
    commonMistake:'Underestimating how much B2 depends on structure and register rather than new grammar rules.',
    ex:[
      'mcq|argument|Complete: "Je größer das Unternehmen, ___ komplexer die Prozesse."|dann;desto;also;damit|desto|je … desto.',
      'mcq|passiv|Which is the lighter alternative to "kann gelöst werden"?|lässt sich lösen;ist gelöst;wird gelöst;muss lösen|lässt sich lösen|sich lassen + Infinitiv.',
      'mcq|modal-verbs|Complete: "Er ___ krank sein, er sieht blass aus."|muss;soll;will;darf|muss|Subjective müssen expresses near certainty from evidence.',
      'fill|professional|Complete politely: "___ auf Ihren Punkt zurückzukommen, …" (to come back to)|Um|Um … zurückzukommen is the fixed phrase.',
    ],
    realLife:{situation:'A B2 exam writing task on a societal topic.', task:'Write a structured paragraph using a concession, a correlative and one subjective modal verb.'},
    summary:['Thesis → evidence → concession → conclusion','Passive alternatives vary style','Subjective modals mark certainty and reported claims'],
  },
  ]},
]);

/* ================================================================
   C1
   ================================================================ */
const C1 = D.buildLevel('C1', [
{
  title:'Wissenschaftliches Schreiben', theme:'Academic and analytical writing',
  goal:'Write and discuss demanding texts with precision.',
  canDo:['Discuss a text\u2019s argument critically','Write an academic paragraph','Use Funktionsverbgefüge correctly'],
  lessons:[
  {
    title:'Funktionsverbgefüge', topic:'style',
    goal:'Recognise and produce fixed noun+verb combinations typical of formal German.',
    why:'These combinations are one of the clearest, most teachable markers of C1 register.',
    intro:'In formal German the meaning often sits in the noun, with the verb reduced to something semantically light.',
    vocab:['v_in_betracht_ziehen_placeholder'],
    grammar:'g_funktionsverben', time:18, skills:['writing','reading'],
    teach:[
      ['The pattern','in Betracht ziehen (= erwägen), zur Verfügung stellen (= geben/bieten), in Frage stellen (= anzweifeln), zur Kenntnis nehmen (= wissen).'],
      ['Fixed, not flexible','The preposition and article cannot be swapped: "in die Betracht ziehen" does not exist.'],
      ['Register signal','These belong to written/formal registers; in speech the simple verb (erwägen, anzweifeln) is often clearer.'],
    ],
    commonMistake:'Translating an English light verb literally: "eine Entscheidung machen" instead of the fixed "eine Entscheidung treffen".',
    ex:[
      'mcq|style|Which phrase means "to consider"?|in Kraft treten;in Betracht ziehen;zur Sprache bringen;Bezug nehmen auf|in Betracht ziehen|A fixed Funktionsverbgefüge meaning "to consider".',
      'fill|style|Complete the fixed expression: "eine Entscheidung ___" (to make a decision)|treffen|eine Entscheidung treffen is fixed; "machen" is not used here.',
      'mcq|style|What does "etwas zur Kenntnis nehmen" mean?|to ignore something;to take note of something;to reject something;to forget something|to take note of something|A formal, slightly distanced way of acknowledging information.',
    ],
    realLife:{situation:'Writing a formal reply to a business proposal.', task:'Use two Funktionsverbgefüge naturally.'},
    summary:['Meaning sits in the noun, verb is light','Fixed combinations, not freely built','Marks formal/written register'],
  },
  {
    title:'Extended Attributes & Reading Dense Text', topic:'syntax',
    goal:'Unpack long noun phrases in academic and official texts.',
    why:'C1 reading comprehension often hinges on locating the head noun inside a long attribute chain.',
    intro:'German can compress a whole relative clause into a string of words before the noun.',
    vocab:['v_tragweite'],
    grammar:'g_erweiterte_attribute', time:18, skills:['reading','writing'],
    teach:[
      ['Reading strategy','Find the article, then jump to the head noun right before the comma or verb; only then unpack what sits between them.'],
      ['Rewriting for clarity','die im letzten Quartal deutlich gestiegenen Kosten = die Kosten, die im letzten Quartal deutlich gestiegen sind.'],
      ['When to use which','Extended attributes are compact and formal; relative clauses are clearer and more common in speech.'],
    ],
    commonMistake:'Reading left to right and losing track of the case, because the head noun appears only at the end of a long phrase.',
    ex:[
      'mcq|syntax|In "die im letzten Quartal gestiegenen Kosten", what is the head noun?|Quartal;Kosten;letzten;gestiegenen|Kosten|Everything between "die" and "Kosten" is one extended attribute.',
      'fill|syntax|Rewrite as a relative clause: "die gestern verschickten Unterlagen" → die Unterlagen, ___ gestern verschickt ___.|die, wurden|die Unterlagen, die gestern verschickt wurden.',
      'mcq|syntax|Which sentence is the extended-attribute (compressed) version of "die Kosten, die im letzten Quartal gestiegen sind"?|die im letzten Quartal gestiegenen Kosten;die letzten Quartal Kosten gestiegen;die Kosten im letzten Quartal steigen;die gestiegenen im letzten Quartal Kosten|die im letzten Quartal gestiegenen Kosten|The extended attribute packs the relative clause between the article and the noun.',
    ],
    realLife:{situation:'Reading a dense paragraph from a report.', task:'Identify the head noun of the longest phrase and restate it as a relative clause.'},
    summary:['Article → head noun → then unpack','Extended attributes compress relative clauses','Useful for reading, riskier for writing under time pressure'],
  },
  ]},
{
  title:'Register und Nuance', theme:'Register and nuance',
  goal:'Control register deliberately across a text.',
  canDo:['Vary register appropriately','Use idioms accurately','Recognise reported speech in journalism'],
  lessons:[
  {
    title:'Konjunktiv I: Reported Speech in Journalism', topic:'grammar',
    goal:'Recognise and produce Konjunktiv I in formal reported speech.',
    why:'German journalism marks reported claims grammatically — recognising this changes how you read the news.',
    intro:'Konjunktiv I signals "this is what was said", without the writer endorsing it.',
    vocab:[],
    grammar:'g_konjunktiv1', time:16, skills:['reading','writing'],
    teach:[
      ['Formation','Infinitive stem + e/est/e/en/et/en: er komme, er habe, er müsse. sein is irregular: ich sei, du seist, er sei.'],
      ['When the form collapses to Konjunktiv II','If Konjunktiv I looks identical to the indicative (common in the plural), Konjunktiv II is used instead: sie hätten, not sie haben.'],
      ['Past reported speech','habe/sei + Partizip II: Er sagte, er sei gekommen.'],
    ],
    commonMistake:'Using the plain indicative in a clearly journalistic reported-speech context, which changes the text\u2019s claimed objectivity.',
    ex:[
      'mcq|konjunktiv|Which sentence uses Konjunktiv I correctly?|Er sagte, er ist müde.;Er sagte, er sei müde.;Er sagte, er war müde.;Er sagte, er wird müde sein.|Er sagte, er sei müde.|sei is the Konjunktiv I form of sein.',
      'fill|konjunktiv|Complete: "Die Sprecherin erklärte, die Lage ___ stabil." (sein)|sei|Konjunktiv I of sein: sei.',
      'mcq|konjunktiv|Why might "sie hätten" appear instead of a Konjunktiv I form?|It is always wrong.;Konjunktiv I would be identical to the indicative here.;hätten is more polite.;There is no reason.|Konjunktiv I would be identical to the indicative here.|When forms collide, Konjunktiv II substitutes.',
    ],
    realLife:{situation:'Reading a news article that quotes an official.', task:'Identify which verbs are in Konjunktiv I and explain why.'},
    summary:['Marks reported, not endorsed, speech','Collapses to Konjunktiv II when identical to the indicative','habe/sei + Partizip II for the past'],
  },
  {
    title:'C1 Idioms, Modal Particles & Register Control', topic:'style',
    goal:'Use idioms and modal particles appropriately, and control register consciously.',
    why:'C1 accuracy is less about new grammar and more about sounding natural and appropriately formal or informal.',
    intro:'Modal particles carry attitude, not dictionary meaning, and idioms carry connotation that a literal translation loses.',
    vocab:[],
    grammar:'g_modalpartikeln', time:16, skills:['speaking','vocabulary'], difficulty:'challenging',
    teach:[
      ['Modal particles','doch (contradiction/insistence), ja (shared knowledge/surprise), mal (softens an imperative), eben/halt (resignation), wohl (assumption). Unstressed, mid-sentence, never sentence-initial.'],
      ['Common C1 idioms','etwas in Betracht ziehen, aus dem Ruder laufen, ins Gewicht fallen, Hand in Hand gehen, den Rahmen sprengen.'],
      ['Register control','Choosing bekommen/erhalten/kriegen, or a nominal vs verbal construction, consistently across a whole text is what distinguishes C1 from strong B2.'],
    ],
    commonMistake:'Translating a modal particle as a full word and placing it at the start of the sentence — "Doch setz dich!" instead of "Setz dich doch!"',
    ex:[
      'mcq|style|Which particle softens an imperative?|ja;mal;wohl;eben|mal|"Schau mal" is friendlier than the bare imperative.',
      'mcq|style|What does "aus dem Ruder laufen" mean?|to go smoothly;to get out of control;to be cancelled;to be delayed|to get out of control|A common idiom for a situation escalating beyond control.',
      'fill|style|Complete the idiom: "etwas in ___ ziehen" (to consider something)|betracht|in Betracht ziehen.',
    ],
    realLife:{situation:'A nuanced conversation about a difficult decision at work.', task:'Use one modal particle and one C1 idiom naturally.'},
    summary:['Modal particles carry attitude, sit mid-sentence','Idioms carry connotation a literal translation loses','Register consistency across a whole text is the C1 marker'],
  },
  ]},
]);

/* ================================================================
   C2
   ================================================================ */
const C2 = D.buildLevel('C2', [
{
  title:'Stilistische Beherrschung', theme:'Stylistic mastery',
  goal:'Control word order and register as deliberate stylistic tools.',
  canDo:['Use word order for emphasis','Control register with precision','Detect connotation and implicature'],
  lessons:[
  {
    title:'Stylistic Word Order and Emphasis', topic:'style',
    goal:'Use fronting, extraposition and ellipsis deliberately for emphasis.',
    why:'At C2 the grammar is no longer the challenge — using its flexibility on purpose is.',
    intro:'What you put in the Vorfeld (position one) signals what the sentence is "about".',
    vocab:[],
    grammar:'g_stilistische_wortstellung', time:18, skills:['writing','reading'],
    teach:[
      ['Marked fronting for emphasis','Nicht das Ergebnis überrascht mich, sondern der Weg dorthin — fronting "nicht das Ergebnis" highlights the contrast.'],
      ['Ausklammerung','Moving heavy material after the final verb for readability: Ich habe lange nachgedacht über diese Frage.'],
      ['Ellipsis in speech and journalism','Alles klar? Kein Problem. Normal in informal registers, avoided in formal writing.'],
    ],
    commonMistake:'Overusing literary inversion in neutral prose, which reads as affected rather than precise.',
    ex:[
      'mcq|style|What effect does fronting "Nicht das Ergebnis" have in "Nicht das Ergebnis überrascht mich, sondern der Weg dorthin"?|None, it is neutral;It highlights a contrast;It is a grammar error;It signals a question|It highlights a contrast|Marked fronting draws attention to what is being contrasted.',
      'mcq|style|Which register typically allows ellipsis like "Kein Problem"?|Legal writing;Academic writing;Informal speech;Official reports|Informal speech|Ellipsis is normal in speech but avoided in formal registers.',
      'fill|style|Rewrite for emphasis by fronting the contrasted element: "Der Weg dorthin überrascht mich, nicht das Ergebnis." → "Nicht das Ergebnis überrascht mich, sondern ___."|der weg dorthin|Fronting "Nicht das Ergebnis" and restating the contrast with sondern puts the emphasis on what really matters here.',
    ],
    realLife:{situation:'Editing a piece of writing for emphasis.', task:'Rewrite one neutral sentence using marked fronting for contrast.'},
    summary:['Vorfeld content signals what the sentence is about','Ausklammerung improves readability','Ellipsis belongs to informal registers'],
  },
  ]},
{
  title:'Register und Konnotation', theme:'Register and connotation',
  goal:'Choose precisely between near-synonyms and keep register consistent.',
  canDo:['Choose the right register for a text','Distinguish near-synonyms by connotation','Write in a chosen style deliberately'],
  lessons:[
  {
    title:'Register and Connotation', topic:'style',
    goal:'Select vocabulary consciously by register and connotation, and maintain consistency.',
    why:'At C2, most remaining errors are not grammatical but a register clash — one wrong word can undercut an otherwise perfect formal letter.',
    intro:'Many German words have same-meaning alternatives that differ only in register or connotation.',
    vocab:[],
    grammar:'g_register', time:20, skills:['writing','vocabulary'], difficulty:'challenging',
    teach:[
      ['Three registers, one meaning','kriegen (colloquial) — bekommen (neutral) — erhalten (formal). Consistency across a text matters more than any single word choice.'],
      ['Connotation beyond register','Problem, Herausforderung and Schwierigkeit share a rough meaning but differ in how much agency and optimism they imply.'],
      ['One slip can undercut a whole text','A single colloquial verb in an otherwise formal letter is often more damaging to the impression than a minor grammar mistake.'],
    ],
    commonMistake:'Mixing registers within one text — most often a colloquial verb such as kriegen inside a formal letter that otherwise uses erhalten-level vocabulary.',
    ex:[
      'mcq|style|Which verb belongs in a formal business letter?|kriegen;bekommen;erhalten;holen|erhalten|erhalten is the most formal of the three near-synonyms.',
      'mcq|style|What connotation does "Herausforderung" carry that "Problem" does not?|Negativity;A sense of opportunity/agency;Urgency;Formality only|A sense of opportunity/agency|Herausforderung frames a difficulty as something to be met, not merely endured.',
      'correct|style|Correct the register clash: Sehr geehrte Damen und Herren, ich hab Ihre Mail gekriegt.|Sehr geehrte Damen und Herren, ich habe Ihre E-Mail erhalten.|A formal letter needs consistent formal vocabulary and full verb forms.',
    ],
    realLife:{situation:'Editing a mixed-register draft letter.', task:'Find and correct one register clash, explaining your choice.'},
    summary:['Register must be consistent across a text','Near-synonyms carry different connotations','A single mismatched word can undercut a formal text'],
  },
  {
    title:'C2 Capstone: Synthesising Sources', topic:'style',
    goal:'Summarise and reconcile two conflicting viewpoints in one coherent, stylistically controlled text.',
    why:'This is the C2 skill the CEFR descriptor names explicitly: summarising information from different sources into a coherent whole.',
    intro:'A synthesis text states each position fairly, marks where they conflict, and reaches a considered conclusion — in a single controlled register.',
    vocab:[],
    grammar:'g_stilistische_wortstellung', time:22, skills:['writing','reading'], difficulty:'advanced',
    teach:[
      ['Structure','Einleitung (both positions named) → Position A mit Beleg → Position B mit Beleg → Gemeinsamkeiten und Widersprüche → eigene Einschätzung.'],
      ['Attributing fairly','Laut X … / Während Y argumentiert, dass … / Dem widerspricht Z, indem …'],
      ['Keeping one register throughout','Every stylistic choice made in Einleitung should still be recognisable in the Einschätzung — synthesis fails if the register drifts.'],
    ],
    commonMistake:'Presenting only one side\u2019s reasoning in full and reducing the other to a caricature — a synthesis must represent both positions in a form their own proponents would recognise.',
    ex:[
      'mcq|style|What is the final step of a synthesis text?|Restating position A;Restating position B;A considered conclusion (Einschätzung);A list of sources|A considered conclusion (Einschätzung)|The synthesis closes with the writer\u2019s own reasoned position.',
      'fill|style|Introduce an opposing view fairly: "While Y argues that …"|während y argumentiert, dass|während + dass-clause fairly introduces a contrasting position.',
      'mcq|style|What should the final Einschätzung of a synthesis text avoid?|Taking any position at all;Reducing one side to a caricature to make the other look stronger;Referring back to both positions;Using a consistent register|Reducing one side to a caricature to make the other look stronger|A fair synthesis represents both positions in a form their own proponents would recognise, even in the concluding evaluation.',
    ],
    realLife:{situation:'Two commentators disagree sharply about a policy.', task:'Write a short synthesis paragraph representing both fairly before giving your own view.'},
    summary:['Einleitung → Position A → Position B → Widersprüche → Einschätzung','Attribute each position fairly before evaluating it','One consistent register from beginning to end'],
  },
  ]},
]);

  return { B2, C1, C2 };
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = CURRICULUM_B2C1C2; }

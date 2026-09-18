/* ============================================================
   COMMON MISTAKES DATABASE (spec §whole weakness engine input)
   Structured records the correction engine and weakness engine
   match against learner input: pattern, why it's wrong, the fix,
   and which weakness bucket it feeds.
   ============================================================ */
const COMMON_MISTAKES = (() => {
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');
  const mk = (id, area, level, wrong, right, explanation, grammarId) => ({
    id: S.ID_PREFIX.mistake + id, area, level, wrong, right, explanation, grammarId, meta: S.meta(),
  });

  return [
  mk('akk_der_den','articles','A1','Ich kaufe der Apfel.','Ich kaufe den Apfel.','Masculine nouns change der→den in the accusative direct object position.','g_akkusativ'),
  mk('neg_kein_nicht','grammar','A1','Ich habe nicht Zeit.','Ich habe keine Zeit.','kein negates an indefinite noun; nicht negates everything else.','g_negation'),
  mk('sein_age','grammar','A0','Ich habe zwanzig Jahre.','Ich bin zwanzig Jahre alt.','German uses sein, not haben, to state age.','g_sein_haben'),
  mk('trennbar_split','wordOrder','A1','Ich aufstehe um sieben.','Ich stehe um sieben auf.','Separable verbs split in a main clause: conjugated part second, prefix at the end.','g_trennbar'),
  mk('modal_infinitiv_end','wordOrder','A1','Ich kann sprechen Deutsch.','Ich kann Deutsch sprechen.','With a modal verb, the infinitive goes to the very end of the sentence.','g_modal'),
  mk('doch_do_question','wordOrder','A1','Tust du arbeiten?','Arbeitest du?','German has no equivalent of English "do" in questions; the verb alone forms the question.','g_questions'),
  mk('article_gender_guess','gender','A1','die Auto','das Auto','Noun gender is not predictable from meaning and must be learned with the word.','g_gender'),
  mk('perfekt_sein_verb','verbForms','A2','Ich habe gegangen.','Ich bin gegangen.','Motion verbs and verbs of change of state take sein, not haben, in the Perfekt.','g_perfekt'),
  mk('perfekt_ieren_ge','verbForms','A2','Ich habe getelefoniert.','Ich habe telefoniert.','Verbs ending in -ieren take no ge- prefix in the participle.','g_perfekt'),
  mk('dativ_helfen_akk','cases','A2','Ich helfe dich.','Ich helfe dir.','helfen always takes a dative object, unlike its English equivalent "to help".','g_dativ'),
  mk('zweiweg_praep_wo_wohin','cases','A2','Ich gehe in der Schule.','Ich gehe in die Schule.','Movement toward a destination takes the accusative after two-way prepositions; only position/state takes the dative.','g_wechselpraep'),
  mk('weil_verb_position','wordOrder','A2','weil ich lerne Deutsch','weil ich Deutsch lerne','Subordinating conjunctions like weil send the conjugated verb to the end of the clause.','g_wordorder'),
  mk('denn_vs_weil_order','wordOrder','A1','…, denn ich bin krank sein.','…, denn ich bin krank.','denn does not change word order like weil does; it behaves like a coordinator.','g_konjunktionen_a1'),
  mk('als_wenn_past','grammar','A2','Wenn ich zehn war, wohnte ich in Kabul.','Als ich zehn war, wohnte ich in Kabul.','A single completed event in the past uses als, not wenn.','g_nebensatz_a2'),
  mk('komparativ_mehr','adjectives','A2','Das ist mehr schnell als der Bus.','Das ist schneller als der Bus.','German forms the comparative with -er, not with "mehr" + adjective.','g_komparativ'),
  mk('komparativ_wie_als','adjectives','A2','schneller wie der Bus','schneller als der Bus','als follows a comparative; wie is only used for equality (so … wie).','g_komparativ'),
  mk('adjektiv_ending_missing','adjectives','A2','ein gut Buch','ein gutes Buch','An attributive adjective before a noun always carries an ending.','g_adjektiv_a2'),
  mk('reflexiv_pronoun_dropped','verbForms','A2','Ich interessiere für Musik.','Ich interessiere mich für Musik.','Reflexive verbs require the reflexive pronoun even where the English equivalent has none.','g_reflexiv'),
  mk('relativsatz_case','grammar','B1','Das ist der Mann, der ich gesehen habe.','Das ist der Mann, den ich gesehen habe.','A relative pronoun\u2019s case comes from its role inside the relative clause, not from the main clause.','g_relativsatz'),
  mk('relativsatz_preposition_left_behind','grammar','B1','die Firma, die ich arbeite bei','die Firma, bei der ich arbeite','A preposition inside a relative clause moves to the front together with its pronoun.','g_relativsatz'),
  mk('passiv_geworden','verbForms','B1','Das Haus ist gebaut geworden.','Das Haus ist gebaut worden.','The Perfekt passive uses "worden", not "geworden".','g_passiv'),
  mk('konjunktiv2_haben','grammar','B1','Ich würde haben Zeit.','Ich hätte Zeit.','haben has its own Konjunktiv II form (hätte); würde + haben is not used.','g_konjunktiv2'),
  mk('konjunktiv2_mixed_condition','grammar','B1','Wenn ich Zeit habe, würde ich kommen.','Wenn ich Zeit hätte, würde ich kommen.','An unreal condition needs Konjunktiv II in both the wenn-clause and the main clause.','g_konjunktiv2'),
  mk('trotzdem_subordinate','wordOrder','B1','…, trotzdem ich gehe raus.','…, trotzdem gehe ich raus.','trotzdem is a conjunctional adverb (position one), not a subordinator; the verb follows it directly.','g_konnektoren_b1'),
  mk('genitiv_apostrophe','grammar','B1','Annas\u2019 Auto','Annas Auto','German genitive names take -s without an apostrophe.','g_genitiv'),
  mk('desto_clause_order','wordOrder','B2','Je mehr man liest, desto man lernt schneller.','Je mehr man liest, desto schneller lernt man.','After desto the comparative comes first, then the verb.','g_konnektoren_b2'),
  mk('zustandspassiv_vorgang','verbForms','B2','Der Laden ist geschlossen. (meaning: is being closed now)','Der Laden wird geschlossen.','Zustandspassiv (ist geschlossen) describes a finished state; an ongoing action needs Vorgangspassiv (wird geschlossen).','g_passiv_erweitert'),
  mk('konjunktiv1_missing','style','B2','Er sagte, er ist müde.','Er sagte, er sei müde.','Formal reported speech in writing uses Konjunktiv I to mark the claim as reported, not endorsed.','g_konjunktiv1'),
  mk('funktionsverb_wrong_verb','style','C1','eine Entscheidung machen','eine Entscheidung treffen','Funktionsverbgefüge are fixed combinations; the verb cannot be swapped freely.','g_funktionsverben'),
  mk('modalpartikel_position','style','C1','Doch setz dich!','Setz dich doch!','Modal particles are unstressed and sit mid-clause; they are not used sentence-initially like full adverbs.','g_modalpartikeln'),
  mk('register_mixing','style','C2','Sehr geehrte Damen und Herren, ich hab Ihre Mail gekriegt.','Sehr geehrte Damen und Herren, ich habe Ihre E-Mail erhalten.','Register must stay consistent; a colloquial verb inside a formal letter undermines the whole text.','g_register'),
  mk('spelling_ei_ie','spelling','A0','Bier read as "bye-er"','Bier read as "beer"','ie is pronounced like English "ee"; ei is pronounced like English "eye" — the reverse of what English spelling suggests.','g_alphabet'),
  mk('capitalisation_noun','spelling','A0','der tisch','der Tisch','All German nouns are capitalised, anywhere in the sentence.','g_capitalisation'),
  mk('possessiv_ending_owner','articles','A1','Sie besucht ihr Vater.','Sie besucht ihren Vater.','The possessive ending agrees with the noun owned (der Vater, accusative), not with the owner.','g_possessiv'),
  mk('numbers_units_tens','vocabulary','A1','vierzig-und-eins for 41','einundvierzig','German compound numbers put the unit before the ten: einundvierzig, not vierzigundeins.','g_praesens'),
  mk('professions_article','grammar','A1','Ich bin ein Lehrer.','Ich bin Lehrer.','Professions after sein take no article in German.','g_praesens'),
  mk('es_gibt_case','cases','A1','Es gibt ein Balkon.','Es gibt einen Balkon.','"es gibt" always takes the accusative.','g_akkusativ'),
  mk('nebensatz_dass_order','wordOrder','A2','Ich glaube, dass er kommt morgen.','Ich glaube, dass er morgen kommt.','After dass the conjugated verb stands at the very end of the clause.','g_nebensatz_a2'),
  mk('gern_vs_mogen','vocabulary','A1','Ich mag schwimmen.','Ich schwimme gern.','German expresses liking an activity with gern after the verb, not with mögen (which is used with nouns).','g_praesens'),
  mk('imperativ_pronoun','grammar','A1','Du komm hier!','Komm her!','The du-imperative drops the pronoun entirely.','g_imperativ'),
  mk('genitiv_praep_dativ','cases','C1','aufgrund dem Wetter','aufgrund des Wetters','Formal genitive prepositions (aufgrund, trotz, während, wegen) take the genitive, not the dative, in careful writing.','g_praep_genitiv'),
  ];
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = { COMMON_MISTAKES }; }

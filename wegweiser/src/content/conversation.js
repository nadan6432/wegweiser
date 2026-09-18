/* ============================================================
   CONVERSATION (spec §34-36)
   Branching scenarios: at each turn the learner picks from
   several plausible responses, some better than others, with
   feedback on the choice. No live chat AI is required or
   simulated — the branches are pre-authored.
   ============================================================ */
const CONVERSATION_SCENARIOS_RICH = (() => {
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');
  const mk = (id, level, title, situation, nodes, opts) => ({
    id: S.ID_PREFIX.conversation + id, level, title, situation,
    nodes, startNode: (opts&&opts.startNode) || 'n1', pathways: (opts&&opts.pathways)||['everyday'],
    meta: S.meta(),
  });

  return [
  mk('a1_baeckerei','A1','In der Bäckerei','You want to buy bread and pay for it.',
    {
      n1:{ speaker:'Verkäuferin', text:'Guten Tag! Was darf es sein?', choices:[
        {text:'Ich hätte gern ein Vollkornbrot, bitte.', quality:'best', feedback:'Höflich und klar formuliert.', next:'n2'},
        {text:'Brot.', quality:'ok', feedback:'Verständlich, aber sehr direkt für eine Bäckerei.', next:'n2'},
        {text:'Ich will Brot!', quality:'poor', feedback:'"Ich will" klingt beim Einkaufen unhöflich; besser "Ich hätte gern".', next:'n2'},
      ]},
      n2:{ speaker:'Verkäuferin', text:'Gerne. Sonst noch etwas?', choices:[
        {text:'Nein, danke. Was macht das zusammen?', quality:'best', feedback:'Natürlicher Abschluss und richtige Frage nach dem Preis.', next:'n3'},
        {text:'Nein.', quality:'ok', feedback:'Kurz, aber du fragst nicht nach dem Preis.', next:'n3'},
      ]},
      n3:{ speaker:'Verkäuferin', text:'Das macht drei Euro fünfzig.', choices:[
        {text:'Hier, bitte. Und eine Quittung, bitte.', quality:'best', feedback:'Vollständig und höflich.', next:'end'},
        {text:'Okay.', quality:'poor', feedback:'Du zahlst nicht wirklich — sag, dass du bezahlst oder gib das Geld.', next:'end'},
      ]},
      end:{ speaker:null, text:'Ende des Gesprächs.', choices:[] },
    }, {startNode:'n1', pathways:['everyday','germany']}),
  mk('a1_arzttermin','A1','Termin beim Arzt vereinbaren','Calling a doctor\u2019s practice to book an appointment.',
    {
      n1:{ speaker:'Empfang', text:'Praxis Dr. Klein, guten Tag.', choices:[
        {text:'Guten Tag, ich hätte gern einen Termin.', quality:'best', feedback:'Höflicher, klarer Einstieg.', next:'n2'},
        {text:'Hallo, ich brauche einen Termin, schnell!', quality:'poor', feedback:'Zu fordernd für den ersten Satz eines Telefonats.', next:'n2'},
      ]},
      n2:{ speaker:'Empfang', text:'Gerne. Waren Sie schon einmal bei uns?', choices:[
        {text:'Nein, das ist mein erster Termin.', quality:'best', feedback:'Klar und relevant.', next:'n3'},
        {text:'Ja.', quality:'ok', feedback:'Kurz, aber ausreichend, falls es stimmt.', next:'n3'},
      ]},
      n3:{ speaker:'Empfang', text:'Passt Ihnen Donnerstag um 10 Uhr?', choices:[
        {text:'Ja, das passt gut. Danke!', quality:'best', feedback:'Freundlicher Abschluss.', next:'end'},
        {text:'Nein, ich kann nicht. Können wir das verschieben?', quality:'best', feedback:'Höflich und klar, wenn der Termin wirklich nicht passt.', next:'end'},
      ]},
      end:{ speaker:null, text:'Ende des Gesprächs.', choices:[] },
    }, {startNode:'n1'}),
  mk('a2_vermieter_beschweren','A2','Sich beim Vermieter beschweren','The heating is broken; you call your landlord.',
    {
      n1:{ speaker:'Vermieter', text:'Ja, hallo?', choices:[
        {text:'Guten Tag, hier ist [Name]. Die Heizung in meiner Wohnung funktioniert seit gestern nicht.', quality:'best', feedback:'Direkt, höflich und mit dem Problem klar benannt.', next:'n2'},
        {text:'Die Heizung ist kaputt!', quality:'poor', feedback:'Verständlich, aber ohne Begrüßung oder Namen wirkt es sehr abrupt.', next:'n2'},
      ]},
      n2:{ speaker:'Vermieter', text:'Oh, das tut mir leid. Ich schicke morgen jemanden vorbei.', choices:[
        {text:'Vielen Dank. Könnten Sie mir eine ungefähre Uhrzeit sagen?', quality:'best', feedback:'Höflich und praktisch — du sicherst dir eine konkrete Information.', next:'n3'},
        {text:'Okay, gut.', quality:'ok', feedback:'Höflich, aber du bekommst keine konkrete Uhrzeit.', next:'n3'},
      ]},
      n3:{ speaker:'Vermieter', text:'Sagen wir zwischen 9 und 11 Uhr.', choices:[
        {text:'Perfekt, dann bin ich zu Hause. Danke für Ihre Hilfe.', quality:'best', feedback:'Freundlicher, klarer Abschluss.', next:'end'},
      ]},
      end:{ speaker:null, text:'Ende des Gesprächs.', choices:[] },
    }, {startNode:'n1'}),
  mk('b1_jobinterview','B1','Ein Vorstellungsgespräch','A short job interview exchange.',
    {
      n1:{ speaker:'Personalerin', text:'Erzählen Sie mir kurz etwas über sich.', choices:[
        {text:'Ich habe drei Jahre Erfahrung im Verkauf und interessiere mich sehr für Kundenkontakt.', quality:'best', feedback:'Relevant, konkret und auf die Stelle bezogen.', next:'n2'},
        {text:'Ich heiße … und bin … Jahre alt.', quality:'poor', feedback:'Zu allgemein — in einem Vorstellungsgespräch werden berufliche Informationen erwartet.', next:'n2'},
      ]},
      n2:{ speaker:'Personalerin', text:'Warum möchten Sie bei uns arbeiten?', choices:[
        {text:'Ihr Unternehmen hat einen sehr guten Ruf im Kundenservice, und das passt zu meinen Stärken.', quality:'best', feedback:'Konkret und zeigt, dass du dich informiert hast.', next:'n3'},
        {text:'Ich brauche einfach einen Job.', quality:'poor', feedback:'Ehrlich, aber wirkt in einem Vorstellungsgespräch unvorteilhaft.', next:'n3'},
      ]},
      n3:{ speaker:'Personalerin', text:'Haben Sie noch Fragen an uns?', choices:[
        {text:'Ja, wie sieht ein typischer Arbeitstag in dieser Position aus?', quality:'best', feedback:'Zeigt echtes Interesse an der Stelle.', next:'end'},
        {text:'Nein, keine Fragen.', quality:'poor', feedback:'Wirkt uninteressiert; mindestens eine Frage wird meist erwartet.', next:'end'},
      ]},
      end:{ speaker:null, text:'Ende des Gesprächs.', choices:[] },
    }, {startNode:'n1', pathways:['work']}),
  mk('b1_meinungsaustausch','B1','Meinungsaustausch: Öffentlicher Nahverkehr','Discussing whether public transport should be free.',
    {
      n1:{ speaker:'Gesprächspartner', text:'Was hältst du davon, den öffentlichen Nahverkehr kostenlos zu machen?', choices:[
        {text:'Ich finde die Idee interessant, aber ich frage mich, wie das finanziert werden soll.', quality:'best', feedback:'Zeigt Offenheit und einen begründeten kritischen Punkt.', next:'n2'},
        {text:'Klingt gut.', quality:'poor', feedback:'Sehr oberflächlich für eine Diskussion — keine Begründung.', next:'n2'},
      ]},
      n2:{ speaker:'Gesprächspartner', text:'Man könnte das über höhere Steuern finanzieren.', choices:[
        {text:'Das ist möglich, allerdings müsste man auch schauen, wer davon am meisten profitiert.', quality:'best', feedback:'Nimmt den Punkt auf und fügt eine eigene Nuance hinzu.', next:'end'},
        {text:'Nein, das ist eine schlechte Idee.', quality:'ok', feedback:'Eine klare Position, aber ohne Begründung wirkt sie abrupt.', next:'end'},
      ]},
      end:{ speaker:null, text:'Ende des Gesprächs.', choices:[] },
    }, {startNode:'n1'}),
  mk('b2_konfliktgespraech','B2','Ein Konfliktgespräch im Team lösen','Resolving a disagreement about a shared project deadline.',
    {
      n1:{ speaker:'Kollege', text:'Ich finde, du hättest mich früher informieren müssen, dass der Termin nicht zu halten ist.', choices:[
        {text:'Da hast du recht, das hätte ich früher tun sollen. Lass uns jetzt überlegen, wie wir das lösen.', quality:'best', feedback:'Nimmt Verantwortung, ohne defensiv zu werden, und lenkt konstruktiv weiter.', next:'n2'},
        {text:'Das war doch nicht meine Schuld!', quality:'poor', feedback:'Wirkt defensiv und eskaliert den Konflikt statt ihn zu lösen.', next:'n2'},
      ]},
      n2:{ speaker:'Kollege', text:'Gut, wie schlägst du vor, dass wir weitermachen?', choices:[
        {text:'Ich schlage vor, dass wir die Aufgaben neu verteilen und den Kunden über die neue Frist informieren.', quality:'best', feedback:'Konkret, lösungsorientiert.', next:'end'},
      ]},
      end:{ speaker:null, text:'Ende des Gesprächs.', choices:[] },
    }, {startNode:'n1', pathways:['work']}),
  ];
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = { CONVERSATION_SCENARIOS_RICH }; }

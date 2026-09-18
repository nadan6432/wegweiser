/* ============================================================
   SPEAKING (spec §31-33)
   No speech recognition or pronunciation scoring exists in this
   app. Every item is "speaking-ready": a structured prompt with
   a model answer and a self-assessment checklist, honestly
   disclosed as self-assessed rather than machine-graded.
   ============================================================ */
const SPEAKING_TASKS = (() => {
  const S = (typeof Schema !== 'undefined') ? Schema : require('../core/schema.js');
  const mk = (id, level, title, task, opts) => ({
    id: S.ID_PREFIX.speaking + id, level, title, task,
    disclosure: 'No pronunciation scoring or speech recognition is performed. Record yourself if you like, then self-assess against the checklist below.',
    prepTimeSeconds: opts.prepTimeSeconds || 30, speakTimeSeconds: opts.speakTimeSeconds || 60,
    modelAnswer: opts.modelAnswer || null, keyPhrases: opts.keyPhrases || [],
    selfCheck: opts.selfCheck || [], meta: S.meta(),
  });

  return [
  mk('a1_vorstellen','A1','Sich vorstellen','Stell dich in 4-5 Sätzen vor: Name, Alter, Herkunft, Wohnort, ein Hobby.',
    { prepTimeSeconds:20, speakTimeSeconds:40,
      modelAnswer:'Ich heiße Tom. Ich bin 30 Jahre alt. Ich komme aus Ghana und wohne jetzt in Frankfurt. In meiner Freizeit spiele ich Fußball.',
      keyPhrases:['Ich heiße …','Ich bin … Jahre alt.','Ich komme aus …','Ich wohne in …'],
      selfCheck:['Habe ich alle vier Informationen genannt?','Habe ich die Verben richtig konjugiert?','War mein Tempo verständlich, nicht zu schnell?'] }),
  mk('a1_bestellen','A1','Im Café bestellen','Stell dir vor, du bist in einem Café. Bestell ein Getränk und etwas zu essen, und frag nach der Rechnung.',
    { prepTimeSeconds:20, speakTimeSeconds:30,
      modelAnswer:'Ich hätte gern einen Kaffee und ein Stück Kuchen, bitte. Können wir die Rechnung haben?',
      keyPhrases:['Ich hätte gern …','Können wir die Rechnung haben?'],
      selfCheck:['Habe ich "Ich hätte gern" statt "Ich will" benutzt?','War meine Bestellung klar?'] }),
  mk('a2_wochenende_erzahlen','A2','Vom Wochenende erzählen','Erzähl in 5-6 Sätzen, was du letztes Wochenende gemacht hast. Benutze das Perfekt.',
    { prepTimeSeconds:40, speakTimeSeconds:60,
      modelAnswer:'Am Samstag bin ich einkaufen gegangen. Danach habe ich mit meiner Familie gekocht. Am Abend haben wir einen Film gesehen. Am Sonntag bin ich spazieren gegangen und habe mich mit Freunden getroffen.',
      keyPhrases:['Am Samstag/Sonntag …','zuerst … danach … am Abend …'],
      selfCheck:['Habe ich das Perfekt richtig gebildet (haben/sein + Partizip II)?','Habe ich die Ereignisse in einer logischen Reihenfolge erzählt?'] }),
  mk('a2_wegbeschreibung','A2','Den Weg beschreiben','Ein Tourist fragt dich nach dem Weg zum Bahnhof. Beschreib den Weg von deiner aktuellen Position.',
    { prepTimeSeconds:30, speakTimeSeconds:45,
      modelAnswer:'Gehen Sie hier geradeaus bis zur Ampel. Dann biegen Sie links ab. Der Bahnhof ist auf der rechten Seite, das sind etwa fünf Minuten zu Fuß.',
      keyPhrases:['geradeaus','links/rechts abbiegen','zu Fuß'],
      selfCheck:['Habe ich den Sie-Imperativ richtig benutzt?','War die Reihenfolge der Anweisungen logisch?'] }),
  mk('b1_meinung_vertreten','B1','Eine Meinung vertreten und begründen','Sprich 1-2 Minuten zu der Frage: Sollte man in der Schule eine zweite Fremdsprache lernen müssen? Nenne deine Meinung und mindestens zwei Gründe.',
    { prepTimeSeconds:60, speakTimeSeconds:90,
      modelAnswer:'Meiner Meinung nach sollte man eine zweite Fremdsprache lernen müssen. Erstens öffnet das viele berufliche Möglichkeiten. Zweitens hilft das Sprachenlernen auch, die eigene Sprache besser zu verstehen. Natürlich kostet es Zeit, aber ich finde, der Nutzen ist größer als der Aufwand.',
      keyPhrases:['Meiner Meinung nach …','Erstens … Zweitens …','Ich finde, dass …'],
      selfCheck:['Habe ich meine Meinung klar am Anfang genannt?','Habe ich mindestens zwei Gründe genannt?','Habe ich Konnektoren wie erstens/zweitens benutzt?'] }),
  mk('b1_beschwerde_muendlich','B1','Sich mündlich beschweren','Du rufst bei deinem Internetanbieter an, weil das Internet seit drei Tagen nicht funktioniert. Beschwer dich höflich und sag, was du erwartest.',
    { prepTimeSeconds:45, speakTimeSeconds:75,
      modelAnswer:'Guten Tag, ich rufe an, weil mein Internet seit drei Tagen nicht funktioniert. Ich arbeite von zu Hause und brauche eine funktionierende Verbindung. Können Sie mir sagen, wann das Problem behoben wird? Ich würde außerdem um eine Gutschrift für die ausgefallenen Tage bitten.',
      keyPhrases:['Ich rufe an, weil …','Können Sie mir sagen …','Ich würde bitten um …'],
      selfCheck:['War mein Ton höflich, aber bestimmt?','Habe ich das Problem klar genannt?','Habe ich eine konkrete Erwartung formuliert?'] }),
  mk('b2_praesentation','B2','Kurzpräsentation mit Struktur','Halte eine 2-3 minütige Präsentation zu einem Thema deiner Wahl (z.B. dein Land, ein Hobby, ein aktuelles Thema). Nutze eine klare Struktur: Einleitung, Hauptteil, Schluss.',
    { prepTimeSeconds:120, speakTimeSeconds:150,
      modelAnswer:null,
      keyPhrases:['Ich möchte heute über … sprechen.','Zunächst … Anschließend … Abschließend …','Zusammenfassend lässt sich sagen, dass …'],
      selfCheck:['Hatte meine Präsentation eine klare Einleitung, einen Hauptteil und einen Schluss?','Habe ich Übergänge zwischen den Teilen markiert?','War mein Register durchgehend angemessen (nicht zu umgangssprachlich)?'] }),
  mk('c1_debatte','C1','An einer Debatte teilnehmen','Nimm Stellung zu einer kontroversen Frage deiner Wahl. Bringe ein Argument vor, räume einen Gegenpunkt ein (zwar … aber), und komme zu einem Fazit.',
    { prepTimeSeconds:90, speakTimeSeconds:120,
      modelAnswer:null,
      keyPhrases:['Zwar … , aber …','Man könnte einwenden, dass … Dennoch …','Zusammenfassend bin ich der Ansicht, dass …'],
      selfCheck:['Habe ich mindestens einen Gegenpunkt ernsthaft eingeräumt?','War meine Argumentation strukturiert (These – Beleg – Einwand – Fazit)?','Habe ich ein konsistentes, formelles Register beibehalten?'] }),
  ];
})();

if(typeof module !== 'undefined' && module.exports){ module.exports = { SPEAKING_TASKS }; }

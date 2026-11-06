/*
  Kartenbox – Einstellungen

  Diese Datei liegt neben karteikarten.html.
  Werte ändern, Datei speichern, Seite neu laden. Fertig.

  Im Tab "Optionen" lassen sich die wichtigsten Werte auch live ändern.
  Dort speichert "Einstellungen sichern" eine neue Version dieser Datei.
  Fehlt ein Wert oder ist er ungültig, gilt der Standardwert.
*/
window.KARTENBOX_EINSTELLUNGEN = {

  schrift: {
    groesse: 18,          // Schriftgröße in px. Kleiner als 12 geht nicht.
    zeilenabstand: 1.6,   // Zeilenhöhe = Schriftgröße x Faktor (1.2 bis 2.2). Die blauen Linien folgen automatisch.
    art: "serif"          // "serif" (Schrift mit Serifen) | "sans" (serifenlos) | "hand" (Handschrift-Look)
  },

  karte: {
    breite: 420,              // Breite der großen Karte in px (240 bis 720). Auf kleinen Bildschirmen wird sie schmaler.
    zeilenMin: 5,             // So viele Zeilen hat die große Karte mindestens
    zeilenMax: 12,            // So viele höchstens. Längerer Text scrollt in der Karte.
    automatischeHoehe: true   // true: Die Karte wird so hoch, dass der längste Text der Runde passt
  },

  faecher: {
    anzahl: 5,        // Karten im Fächer (3 bis 7)
    groesse: 0.55,    // Größe der Fächerkarten im Verhältnis zur großen Karte (0.35 bis 0.8)
    winkel: 10,       // Winkel zwischen zwei Karten in Grad (4 bis 16)
    unschaerfe: 7     // Unschärfe der Fragen im Fächer in px (3 bis 14)
  },

  animation: {
    an: true,         // false: alles springt ohne Animation
    tempo: 1          // 0.5 = halb so schnell, 2 = doppelt so schnell (0.4 bis 3)
  },

  lernen: {
    mischen: false,   // true: Karten werden zu Beginn jeder Runde gemischt
    tastatur: true,   // Leertaste = umdrehen, Pfeil rechts oder Enter = gewusst, Pfeil links = nochmal, 1 bis 7 = Karte wählen, Esc = zurücklegen
    timer: true,      // true: Countdown bei der Frage. Bei 0 dreht sich die Karte zur Lösung. false: alles manuell
    sekunden: 30,     // Dauer des Countdowns (10 bis 60)
    tagesziel: 10     // Karten pro Tag (0 bis 200). 0 schaltet das Ziel aus
  },

  design: {
    thema: "auto"     // "auto" (wie das System) | "hell" | "dunkel"
  },

  update: {
    pruefen: true     // true: Die App fragt online höchstens einmal am Tag bei GitHub nach einer neuen Version. false: nie
  }
};

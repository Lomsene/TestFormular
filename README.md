# DHSH · Formular „Verfügbarkeiten der Dozierenden“

Eigenständiges Erfassungsformular (Vue 3 + TypeScript + Vite). Dozierende tragen hier ihre
Terminwünsche bzw. Verfügbarkeiten für einen Theorieblock ein. Ergebnis sind **Zeitfenster je
Wochentag** (kann / kann nicht) in einem festen JSON-Format, das die Hauptanwendung
(Stundenplanung, CP-SAT) einliest. Das Formular **ist nicht** die Hauptanwendung.

> **Stand: Testversion zur Übergabe an das UI/UX-Team.** Die Fachlogik ist vollständig und
> getestet. Oberfläche, Texte und Gestaltung sind ein funktionsfähiger Entwurf und ausdrücklich
> zum Überarbeiten gedacht. Es gibt noch kein Backend. Alles läuft lokal im Browser.

---

## 1. Schnellstart für das UI/UX-Team

Voraussetzung: [Node.js](https://nodejs.org) **22 oder neuer**.

```bash
cd frontend
npm install
npm run dev        # öffnet http://localhost:5173
```

Mehr ist nicht nötig. Es gibt keinen Login, keine Datenbank und keine Zugangsdaten.

- **Absenden** lädt eine JSON-Datei herunter, es wird nichts verschickt.
- Eingaben werden im Browser zwischengespeichert (`localStorage`). **Neu anfangen:** nach dem
  Absenden auf „Neues Formular für eine andere Person“ klicken oder in den DevTools unter *Application → Local Storage*
  die Einträge `dhsh-verfuegbarkeit-*` löschen.
- „Wie im letzten Jahr“ findet nur Einreichungen, die **in diesem Browser** mit derselben
  E-Mail-Adresse für den Vorjahresblock abgesendet wurden. Zum Ausprobieren: im Formular den
  Block „Januar bis März 2026“ wählen und absenden, danach mit derselben E-Mail-Adresse den
  Block „Januar bis März 2027“ ausfüllen.

Weitere Befehle:

```bash
npm test           # Fachregeln (Vitest)
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # gebaute Version ansehen
npm run format     # Prettier
```

---

## 2. Was ist neu in dieser Runde (Feedback umgesetzt)

| Feedback                                                                 | Umsetzung                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Freiberufler: **bevorzugte Zeiten** markieren                            | Neuer Pinsel **„Bevorzugt“** im Wochenraster (dunkelgrün). Bevorzugt = verfügbar und am liebsten dann.                                                                                         |
| Freiberufler: **Besonderheiten in einzelnen Wochen** (optional)          | Neuer Bereich **„Besonderheiten im Theorieblock“** unter dem Raster. Er öffnet sich erst mit dem Haken **„Ja, in einzelnen Wochen ist es anders“**. Haken entfernen löscht die Markierungen wieder. Kalender mit allen Wochen des Blocks: Klick auf einen Tag = „geht nicht“, Klick auf „Woche N“ = ganze Woche. Je Tag umstellbar auf „geht ausnahmsweise doch“ und „nur zeitweise“ (von–bis). |
| Hauptamtliche: Wunsch **zu unübersichtlich und komplex**                 | Terminwunsch **Schritt für Schritt**, je Bildschirm genau eine Frage: ① **Haben Sie einen Terminwunsch?** (Ja / Nein / Wie im letzten Jahr) → ② **An welchem Tag?** (Montag–Freitag / Jeden Tag) → ③ **Was wünschen Sie sich freitags?** (Keine Lehre / Gern Lehre / Erst ab … Uhr / Nur bis … Uhr / **Nur von … bis … Uhr** / Nur online; bei „Jeden Tag“: Höchstzahl Stunden). Im letzten Schritt erscheint der fertige Satz. Bei „Nein“ oder „Wie im letzten Jahr“ entfallen ② und ③, die Schrittleiste passt sich sofort an. |
| ebenso                                                                   | „Letzter Block“ und „Präsidium“ sind ein gemeinsamer Schritt **„Weitere Angaben“**. Hauptamtliche haben 4 statt 5 Schritte.                                                                 |

Das Übergabeformat ist dafür auf `schemaVersion: 2` erweitert worden, siehe
[frontend/docs/datenformat.md](frontend/docs/datenformat.md).

---

## 3. Ablauf und Bildschirme

Im ersten Schritt wählt man, was auf einen zutrifft. Davon hängen die folgenden Schritte ab. Die
Schrittleiste passt sich sofort an. „Weiter“ prüft nur den aktuellen Schritt.

| Hauptamtlich                                                            | Freiberufler / Teilzeit                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| 1 Ihre Angaben → 2 Terminwunsch → 3 Tag → 4 Was genau? → 5 Weitere Angaben → 6 Prüfen & absenden<br>(ohne eigenen Wunsch entfallen 3 und 4) | 1 Ihre Angaben → 2 Verfügbarkeit → 3 Prüfen & absenden |

| Bildschirm                    | Datei (`frontend/src/…`)                                       | Inhalt                                                                  |
| ----------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Rahmen, Kopfzeile, Navigation | `App.vue`, `components/StepIndicator.vue`                      | Logo, Schrittleiste, Zurück/Weiter, rechte Wochenvorschau (Hauptamtl.)  |
| 1 Ihre Angaben                | `components/steps/StepPerson.vue`                              | Art der Beschäftigung, Name, E-Mail, Theorieblock                       |
| 2–4 Terminwunsch, Tag, Was genau? (hauptamtl.) | `components/steps/StepWish.vue` (`part="answer" \| "day" \| "what"`) + `components/WishEditor.vue` | je eine Frage pro Schritt; im Schritt „Was genau?“ optional weitere Wünsche (nur nach Absprache mit dem Präsidium, kompakt dargestellt) |
| 5 Weitere Angaben (hauptamtl.)| `components/steps/StepDetails.vue`                             | Wunsch im letzten Block berücksichtigt? Präsidiumsmitglied + Sitzungstag |
| 2 Verfügbarkeit (Freiberufl.) | `components/steps/StepGrid.vue` + `components/WeekGridEditor.vue` | Wochenraster zum Ausmalen mit Pinseln                                |
| … Besonderheiten              | `components/ExceptionCalendar.vue`                             | optionaler Kalender für einzelne Tage/Wochen                            |
| Prüfen & absenden             | `components/SummaryView.vue`, `components/WeekPreview.vue`     | Zusammenfassung, Tabelle „kann / kann nicht“, Wochenansicht             |
| Nach dem Absenden             | `components/SuccessView.vue`                                   | Bestätigung, Bearbeiten, neues Formular                                 |
| Bausteine                     | `components/ChoiceGroup.vue`, `FieldMessages.vue`, `PreviousYearPanel.vue` | Knopfgruppen (echte Radiobuttons), Fehlermeldungen, „wie im letzten Jahr“ |

### Testszenarien (Vorschlag für Usability-Tests)

1. **Hauptamtlich, ein einfacher Wunsch:** „Freitags ab 13 Uhr möchte ich nicht mehr lehren.“
   Variante: „Mittwochs nur von 10 bis 14 Uhr.“
2. **Hauptamtlich, Höchstgrenze:** „Maximal 5 Unterrichtsstunden pro Tag“ (→ „Jeden Tag“).
3. **Hauptamtlich, Präsidium:** Mitglied, Sitzungen mittwochs, und Wunsch „mittwochs gern Lehre“.
   Hier sollte eine Fehlermeldung kommen.
4. **Freiberuflich:** Mo + Di ganztägig verfügbar, Dienstagvormittag bevorzugt, nur online am
   Donnerstagnachmittag.
5. **Freiberuflich mit Besonderheiten:** wie 4, zusätzlich eine Urlaubswoche und an einem Tag
   nur nachmittags nicht verfügbar.
6. **Nur Tastatur / Screenreader:** Szenario 1 und 4 ohne Maus.

---

## 4. Gestaltung: was frei ist und was fest ist

**Frei gestaltbar** (bitte gern überarbeiten):

- Layout, Abstände, Typografie, Komponentenaufbau, Reihenfolge innerhalb eines Schritts
- alle Texte, Beschriftungen, Hinweise und Fehlermeldungen (Fehlermeldungen stehen in
  `domain/validation.ts` und `domain/draft.ts`)
- Farben: alle Design-Tokens stehen zentral in `src/styles/main.css` (`:root`). Die Akzentfarben
  kommen aus dem DHSH-Logo, die Anmutung ist an den Teams-Kalender angelehnt.
- Interaktion des Rasters (Pinsel + Aufziehen) und des Besonderheiten-Kalenders

**Fachlich fest** (Änderungen bitte mit Stundenplanung/Projektteam abstimmen):

- Die Regeln aus dem Merkblatt (siehe Abschnitt 6), z. B.: ein Wunsch bezieht sich auf genau
  einen Wochentag, die Stundenhöchstgrenze liegt bei mindestens 4 UE und wird nicht kombiniert,
  der Präsidiums-Sitzungstag ist gesperrt.
- Die Bedeutung der **Statusfarben**, die sich durch alle Ansichten zieht:

  | Status                | Token                               | Bedeutung                             |
  | --------------------- | ----------------------------------- | ------------------------------------- |
  | Bevorzugt             | `--st-preferred(-bg)`               | passt am besten                       |
  | Verfügbar             | `--st-available(-bg)`               | passt                                 |
  | Nur online            | `--st-online(-bg)`                  | nur Online-Lehre                      |
  | Möglichst nicht       | `--st-unavailable-bg`, schraffiert  | Wunsch, kein Anspruch (weich)         |
  | Nicht verfügbar       | `--st-unavailable`, kräftig         | verbindlich (hart)                    |

  Rot/Grün darf nie die **einzige** Unterscheidung sein. Es gibt immer auch Text, Schraffur
  oder Beschriftung.
- Das Übergabeformat (`domain/types.ts`, `docs/datenformat.md`). Die Oberfläche darf beliebig
  umgebaut werden, solange am Ende dieselben Daten entstehen.

**Technisch gut zu wissen:** Die Oberfläche (`components/`) enthält keine Fachlogik. Alles, was
gerechnet oder geprüft wird, liegt in `domain/` und ist mit Tests abgesichert. Wer nur die UI
umbaut, sollte nach Änderungen `npm test` und `npm run build` grün sehen.

### Barrierefreiheit (Stand)

- Alle Auswahlknöpfe sind echte Radiobuttons (`ChoiceGroup.vue`), also mit Pfeiltasten und
  Screenreadern bedienbar.
- Wochenraster: Tab zu einer Zelle, Pfeiltasten bewegen, Leertaste/Enter malt, Tasten 1–4
  wechseln den Pinsel. Jede Zelle hat eine Beschriftung (z. B. „Montag 09:00–09:30: bevorzugt“).
- Besonderheiten-Kalender: Tage sind Umschaltknöpfe (`aria-pressed`) mit vollem Datum als
  Beschriftung.
- Die Wochenvorschau ist für Screenreader zusätzlich als Liste vorhanden.
- Noch **nicht** geprüft: vollständiger WCAG-2.1-AA-Audit, Kontraste der Statusfarben in allen
  Kombinationen, Verhalten mit 200 % Zoom.

---

## 5. Offene UX-Fragen (Vorschläge zum Weiterdenken)

- **Besonderheiten bei ganzen Wochen:** Eine markierte Woche erzeugt fünf Einzelzeilen in der
  Liste. Besser zu „Woche 3 (18.–22.01.): geht nicht“ zusammenfassen?
- **Länge des Blocks:** Der Kalender zeigt alle Wochen von Beginn bis Ende des Blocks. Mit den
  Beispieldaten in `domain/config.ts` sind das 11–12 Wochen. Hat das Semester tatsächlich
  10 Wochen, müssen nur Beginn und Ende der Blöcke dort angepasst werden.
- **Bevorzugt und nur online gleichzeitig** ist im Raster nicht möglich (ein Slot hat einen
  Zustand). Wird das gebraucht?
- **Raster auf dem Handy:** Bedienbar, aber eng (20 Zeilen × 5 Tage). Lohnt sich auf kleinen
  Bildschirmen eine Tag-für-Tag-Ansicht?
- **„Weitere Wünsche“ (Ausnahmefall)** bei Hauptamtlichen: Der Link steht unauffällig im Schritt
  „Was genau?“, weitere Wünsche werden dort kompakt (Tag + was) angezeigt. Ist er noch zu
  prominent oder schon zu versteckt?
- **Sechs Schritte bei Hauptamtlichen:** Jede Frage hat jetzt einen eigenen Bildschirm. Das ist
  einfacher, bedeutet aber mehr Klicks. Sollte die Auswahl automatisch weiterspringen? (Bewusst
  nicht umgesetzt, weil Tastaturnutzende mit den Pfeiltasten durch die Optionen gehen.)
- Die Karten für die Wochentage sind unterschiedlich hoch („Jeden Tag“ hat eine Erklärung).
- **Wochenvorschau rechts:** Hilft sie beim Ausfüllen oder lenkt sie ab?

---

## 6. Fachliche Grundlagen

### Dozierendengruppen

| Gruppe                    | Stand                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Hauptamtlich Lehrende     | vollständig nach Merkblatt „Terminwünsche Stundenplanung“                           |
| Freiberufliche Dozierende | **vorläufig**: Wochenraster (verfügbar/bevorzugt/online) + optionale Besonderheiten |
| Teilzeit-Dozierende       | **vorläufig**: wie Freiberufler                                                     |

Alle Gruppen erzeugen dasselbe Ausgabeformat.

### Merkblatt → Umsetzung (hauptamtlich)

| Regel im Merkblatt                                           | Umsetzung                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Genau **ein** Terminwunsch, bezogen auf **einen** Wochentag  | Satzbaukasten: ein Tag, eine Angabe                                      |
| „montags keine“ / „gern freitags“                            | Tag + „keine Lehre“ / „gern Lehre“                                        |
| „montags erst nach 13 Uhr“ / „freitags nach 13 Uhr keine“    | Tag + „erst ab … Uhr“ / „nur bis … Uhr“                                   |
| „mittwochs nur von 10 bis 14 Uhr“ (Zeitraum an einem Tag)   | Tag + „nur von … bis … Uhr“ (Wunsch `DAY_RANGE`, Ergänzung zum Merkblatt) |
| „montags nur Online-Lehre“                                   | Tag + „nur online“                                                        |
| Stundenhöchstgrenze ≥ 4 UE, nicht kombinierbar               | „Jeden Tag“ + Anzahl, Minimum 4, Hinweis bei Kombination                  |
| Mehrere Tage / Uhrzeit über mehrere Tage unzulässig          | durch die Eingabe gar nicht möglich                                       |
| Kein Eintrag = kein Wunsch                                   | ausdrückliche Antwort „Nein, kein Wunsch“                                 |
| Mehr als ein Wunsch nur nach Abstimmung mit dem Präsidium    | „+ Weiteren Wunsch“ (max. 3) nur mit Bestätigungshäkchen; Vorrang hat der erste Wunsch |
| Spalte „Wunsch im letzten Block berücksichtigt (ja/nein)“    | Pflichtfrage Ja / Nein / „hatte keinen Wunsch“; Nein → `priorityClaim`    |
| Präsidiumssitzungen zählen nicht als Wunsch                  | eigene Frage, Sitzungstag wird **hart** gesperrt; Warnung, wenn der Wunsch auf denselben Tag fällt |
| Wunsch ist kein Anspruch                                     | Wunsch-Fenster sind `SOFT`, Sitzungen/Raster `HARD`                       |
| Frist eine Woche                                             | Frist je Theorieblock, Hinweis nach Ablauf                                |

### „Wie im letzten Jahr“

Gibt es beim Terminwunsch, beim Präsidium und beim Verfügbarkeitsraster. Gemeint ist der
entsprechende Theorieblock des Vorjahres (`previousYearBlockId` in `config.ts`). Liegen die
Vorjahresangaben vor, werden sie angezeigt und übernommen oder als Vorlage bearbeitet. Liegen
sie nicht vor, geht ein Verweis an die Hauptanwendung (`resolved: false`,
`result.pendingPreviousYear = true`). Besonderheiten an einzelnen Tagen werden **nicht** aus dem
Vorjahr übernommen, weil sie an Daten hängen.

---

## 7. Technik

```
frontend/
  docs/datenformat.md   Übergabeformat für die Hauptanwendung
  src/
    domain/             reine Fachlogik, ohne Vue, vollständig getestet (*.spec.ts)
      types.ts            Datenmodell + Übergabeformat
      config.ts           Lehrzeiten, Raster, Theorieblöcke (später aus dem Backend)
      draft.ts            Satzbaukasten-Zustand ↔ Terminwunsch
      calendar.ts         Wochen und Tage eines Theorieblocks
      validation.ts       Merkblatt-Regeln (Fehler/Hinweise)
      windows.ts          Antworten → Zeitfenster
      export.ts           Übergabedokument bauen
      format.ts           Texte („Ich möchte freitags ab 13 Uhr keine …“)
    composables/        Formularzustand, Schritte, Entwurf im Browser (localStorage)
    components/         Oberfläche (siehe Abschnitt 3)
    services/           Übermittlung (POST oder Datei), Vorjahresdaten
    styles/main.css     Design-Tokens und Grundbausteine
```

Optional: `VITE_SUBMIT_URL=https://…/api/availabilities` in `frontend/.env.local` setzen. Dann
wird per `POST` (JSON) übermittelt. Ohne diese Einstellung wird eine JSON-Datei heruntergeladen
(Ablage im DMS, Übergangslösung).

## 8. Offene fachliche Punkte (mit Stundenplanung/Projektteam klären)

- Lehrzeiten: aktuell Mo–Fr, 08:00–18:00 Uhr, 30-Minuten-Raster, UE = 45 Min. (`domain/config.ts`). Samstag?
- Länge und Daten der Theorieblöcke (10 Wochen?) sowie Fristen kommen derzeit aus `config.ts` und sollten aus dem Backend kommen.
- Präsidiumssitzungen: Tag von den Mitgliedern angeben lassen (jetzt) oder zentral pflegen?
- Wie stark soll der Solver „bevorzugt“ gewichten (Freiberufler)?
- Wunsch „nur von … bis … Uhr“ ist eine Ergänzung zum Merkblatt (dort nur „ab“ bzw. „bis“). Bitte mit der Stundenplanung bestätigen, dass das als **ein** Terminwunsch zählt.
- Anmeldung über Keycloak: Dann entfallen Name und E-Mail als Eingabe.
- DSGVO: Das Formular verarbeitet Name und E-Mail (personenbezogen).
- Endgültige Regeln für Freiberufler und Teilzeit.

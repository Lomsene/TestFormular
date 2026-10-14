# DHSH · Formular „Verfügbarkeiten der Dozierenden“

Eigenständiges Erfassungsformular (Vue 3 + TypeScript + Vite). Dozierende tragen hier ihre
Terminwünsche bzw. Verfügbarkeiten für einen Theorieblock ein. Ergebnis sind **Zeitfenster je
Wochentag** (kann / kann nicht) in einem festen JSON-Format, das die Hauptanwendung
(Stundenplanung, CP-SAT) einliest. Das Formular **ist nicht** die Hauptanwendung.

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Fachregeln (Vitest)
npm run build      # Typecheck + Produktions-Build nach dist/
npm run format     # Prettier
```

Optional: `VITE_SUBMIT_URL=https://…/api/availabilities` in `.env.local` setzen. Dann wird per
`POST` (JSON) übermittelt. Ohne diese Einstellung wird eine JSON-Datei heruntergeladen (Ablage im
DMS, Übergangslösung).

## Ablauf

Das Formular führt Schritt für Schritt durch die Angaben. Im ersten Schritt wählt man, was auf
einen zutrifft (hauptamtlich / freiberuflich / Teilzeit). Davon hängen die folgenden Schritte ab,
die Schrittleiste passt sich sofort an. „Weiter“ prüft nur den aktuellen Schritt:

| Hauptamtlich                                                                                | Freiberufler / Teilzeit                          |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1 Ihre Angaben → 2 Terminwunsch → 3 Letzter Block → 4 Präsidium → 5 Prüfen & absenden       | 1 Ihre Angaben → 2 Verfügbarkeit → 3 Prüfen & absenden |

**„Wie im letzten Jahr“** gibt es bei Terminwunsch, Präsidium und Verfügbarkeitsraster. Gemeint
ist der entsprechende Theorieblock des Vorjahres (`previousYearBlockId` in `config.ts`).
Liegen die Vorjahresangaben vor, werden sie angezeigt und unverändert übernommen oder als
Vorlage bearbeitet. Liegen sie nicht vor, geht ein Verweis an die Hauptanwendung
(`sameAsPreviousYear.resolved = false`, `result.pendingPreviousYear = true`).
Vorjahresangaben stammen derzeit aus abgesendeten Einreichungen in diesem Browser
(`services/history.ts`). Später kommen sie über eine Schnittstelle der Hauptanwendung.

Bei „Wurde Ihr Wunsch im letzten Block berücksichtigt?“ gibt es diese Option bewusst nicht. Das
ist eine Ja/Nein-Tatsache und keine Zeitangabe.

## Dozierendengruppen

| Gruppe                    | Stand                                                         |
| ------------------------- | ------------------------------------------------------------- |
| Hauptamtlich Lehrende     | vollständig nach Merkblatt „Terminwünsche Stundenplanung“     |
| Freiberufliche Dozierende | **vorläufig**: Wochenraster zum Ausmalen, Regeln folgen noch |
| Teilzeit-Dozierende       | **vorläufig**: Wochenraster zum Ausmalen, Regeln folgen noch |

Alle Gruppen erzeugen dasselbe Ausgabeformat. Neue Regeln für Freiberufler/Teilzeit brauchen
nur einen neuen `AvailabilityEntry`-Typ plus Umrechnung in `domain/windows.ts`.

## Merkblatt → Umsetzung (hauptamtlich)

| Regel im Merkblatt                                           | Umsetzung                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Genau **ein** Terminwunsch, bezogen auf **einen** Wochentag  | Auswahl einer Wunschart, Wochentag als Einfachauswahl                     |
| „montags keine“ / „gern freitags“                            | Wunschart „Ein ganzer Wochentag“ + keine Lehre / gern Lehre               |
| „montags erst nach 13 Uhr“ / „freitags nach 13 Uhr keine“    | „Ein Wochentag ab/bis Uhrzeit“: Vormittag oder Nachmittag frei + Uhrzeit  |
| „montags nur Online-Lehre“                                   | „Ein Wochentag nur online“                                                |
| Stundenhöchstgrenze ≥ 4 UE, nicht kombinierbar               | „Höchstens … Stunden pro Tag“, Minimum 4, Hinweis bei Kombination         |
| Mehrere Tage / Uhrzeit über mehrere Tage unzulässig          | durch die Eingabe gar nicht möglich                                       |
| Kein Eintrag = kein Wunsch                                   | ausdrückliche Option „Kein Wunsch“                                        |
| Mehr als ein Wunsch nur nach Abstimmung mit dem Präsidium    | „+ Weiteren Wunsch“ (max. 3) nur mit Bestätigungshäkchen; Vorrang hat der erste Wunsch |
| Spalte „Wunsch im letzten Block berücksichtigt (ja/nein)“    | Pflichtfrage Ja / Nein / „hatte keinen Wunsch“; Nein → `priorityClaim`    |
| Präsidiumssitzungen zählen nicht als Wunsch                  | eigener Abschnitt, Sitzungstag wird **hart** gesperrt; Warnung, wenn der Wunsch auf denselben Tag fällt |
| Wunsch ist kein Anspruch                                     | Wunsch-Fenster sind `SOFT`, Sitzungen/Raster `HARD`                       |
| Frist eine Woche                                             | Frist je Theorieblock, Hinweis nach Ablauf                                |

## Aufbau

```
src/
  domain/          reine Fachlogik, ohne Vue, vollständig getestet
    types.ts         Datenmodell + Übergabeformat
    config.ts        Lehrzeiten, Raster, Theorieblöcke (später aus dem Backend)
    validation.ts    Merkblatt-Regeln (Fehler/Hinweise)
    windows.ts       Antworten → Zeitfenster
    export.ts        Übergabedokument bauen
    format.ts        Texte („Ich möchte freitags ab 13 Uhr keine …“)
  composables/     Formularzustand, Entwurf im Browser (localStorage)
  components/      Oberfläche
  services/        Übermittlung (POST oder Datei)
```

## Offene Punkte (mit Stundenplanung/Projektteam klären)

- Lehrzeiten: aktuell Mo–Fr, 08:00–18:00 Uhr, 30-Minuten-Raster, UE = 45 Min. (`domain/config.ts`). Samstag?
- Präsidiumssitzungen: Tag von den Mitgliedern angeben lassen (jetzt) oder zentral pflegen?
- Theorieblöcke und Fristen kommen derzeit aus `config.ts` und sollten aus dem Backend kommen.
- Anmeldung über Keycloak: Dann entfallen Name und E-Mail als Eingabe.
- DSGVO: Das Formular verarbeitet Name und E-Mail (personenbezogen).
- Regeln für Freiberufler und Teilzeit.

Datenformat für die Hauptanwendung: siehe [docs/datenformat.md](docs/datenformat.md).

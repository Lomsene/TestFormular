# Übergabeformat `AvailabilityExport` (schemaVersion 1)

Ein Dokument pro Person und Theorieblock. Typdefinition: `src/domain/types.ts`.
Alle Uhrzeiten sind **Minuten seit Mitternacht** (780 = 13:00). Wochentage: `MO TU WE TH FR SA`.

```jsonc
{
  "schemaVersion": 1,
  "submittedAt": "2026-10-14T10:00:00.000Z",
  "block": { "id": "2027-01", "label": "Theorieblock Januar bis März 2027", "start": "2027-01-04", "end": "2027-03-26" },
  "lecturer": { "lastName": "Müller", "firstName": "Max", "email": "max.mueller@dhsh.de", "kind": "FULL_TIME" },

  // Rohantworten, so wie eingegeben (zur Nachvollziehbarkeit)
  "answers": {
    "kind": "FULL_TIME",
    "wishes": [{ "kind": "DAY_TIME", "weekday": "FR", "blocked": "AFTER", "time": 780 }],
    "exceptionAgreedWithPresidium": false,
    "wishConsideredLastBlock": "NO",          // YES | NO | NO_WISH
    "presidium": { "isMember": true, "sessionWeekday": "WE" },
    // „wie im letzten Jahr“ je Teil; null = nicht gewählt
    "sameAsPreviousYear": { "wishes": null, "presidium": null }
  },

  // Damit plant die Hauptanwendung
  "result": {
    "lecturerKind": "FULL_TIME",
    "windows": [
      { "weekday": "MO", "start": 480, "end": 1080, "status": "AVAILABLE",   "hardness": "HARD", "source": { "type": "DEFAULT" } },
      { "weekday": "TU", "start": 480, "end": 1080, "status": "AVAILABLE",   "hardness": "HARD", "source": { "type": "DEFAULT" } },
      { "weekday": "WE", "start": 480, "end": 1080, "status": "UNAVAILABLE", "hardness": "HARD", "source": { "type": "PRESIDIUM" } },
      { "weekday": "TH", "start": 480, "end": 1080, "status": "AVAILABLE",   "hardness": "HARD", "source": { "type": "DEFAULT" } },
      { "weekday": "FR", "start": 480, "end": 780,  "status": "AVAILABLE",   "hardness": "HARD", "source": { "type": "DEFAULT" } },
      { "weekday": "FR", "start": 780, "end": 1080, "status": "UNAVAILABLE", "hardness": "SOFT", "source": { "type": "WISH", "rank": 1 } }
    ],
    "constraints": { "maxUnitsPerDay": null },   // z. B. { "units": 4, "hardness": "SOFT" }
    "priorityClaim": true,
    "pendingPreviousYear": false
  },

  "frame": { "teachingDays": ["MO","TU","WE","TH","FR"], "dayStart": 480, "dayEnd": 1080, "unitMinutes": 45 }
}
```

## Bedeutung für den Solver

| Feld                 | Werte                                                       | Verwendung                                                            |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `status`             | `PREFERRED`, `AVAILABLE`, `ONLINE_ONLY`, `UNAVAILABLE`      | grün / grün / gelb (nur Online-Veranstaltungen) / rot                 |
| `hardness`           | `HARD`, `SOFT`                                              | `HARD` = harte Nebenbedingung, `SOFT` = Strafterm (Wunsch, kein Anspruch) |
| `source`             | `DEFAULT`, `WISH` (+ `rank`), `PRESIDIUM`, `GRID`           | Herkunft; `rank` 1 = erstgenannter Wunsch (höchste Priorität)         |
| `maxUnitsPerDay`     | Anzahl UE                                                   | tagesbezogene Obergrenze, gilt an allen Tagen                         |
| `priorityClaim`      | bool                                                        | Wunsch wurde zuletzt nicht erfüllt → Strafgewicht erhöhen (Merkblatt) |
| `pendingPreviousYear`| bool                                                        | „wie im letzten Jahr“ gewählt, Vorjahresdaten lagen nicht vor → aus Vorjahreseinreichung ergänzen |

## „Wie im letzten Jahr“

`answers.sameAsPreviousYear` (Hauptamtlich: je `wishes` und `presidium`, Raster: direkt) ist
`null` oder `{ "blockId": "2026-01", "resolved": true|false }`.

- `resolved: true`: Die Vorjahresangaben lagen vor und stehen bereits in `answers` und `result`.
- `resolved: false`: Der betreffende Teil fehlt in `answers`/`result`. Die Hauptanwendung
  übernimmt ihn aus der Einreichung derselben E-Mail-Adresse für `blockId`.

Zusicherungen:

- Die Fenster decken jeden Lehrtag aus `frame.teachingDays` **lückenlos** von `dayStart` bis
  `dayEnd` ab, ohne Überlappung, sortiert nach Tag und Uhrzeit.
- Bei Freiberufler/Teilzeit (`source.type = "GRID"`) sind alle Fenster `HARD`.

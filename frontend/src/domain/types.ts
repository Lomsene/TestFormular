/**
 * Fachliches Datenmodell für die Erfassung der Verfügbarkeiten von Dozierenden.
 *
 * Grundlage für hauptamtlich Lehrende: „DHSH Merkblatt Terminwünsche Stundenplanung“.
 * Das Ausgabeformat (AvailabilityResult) ist für alle Dozierendengruppen gleich, damit
 * Kalender, Konfliktanzeige und Solver (CP-SAT) nur ein Format verstehen müssen.
 */

export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const
export type Weekday = (typeof WEEKDAYS)[number]

/** Uhrzeit als Minuten seit Mitternacht (z. B. 13:00 → 780). */
export type Minutes = number

export type LecturerKind = 'FULL_TIME' | 'FREELANCE' | 'PART_TIME'

// ---------------------------------------------------------------------------
// Terminwünsche hauptamtlich Lehrender (genau eine der zulässigen Formen)
// ---------------------------------------------------------------------------

/** „Ich möchte montags (keine | gern) Lehrveranstaltungen abhalten.“ */
export interface DayWish {
  kind: 'DAY'
  weekday: Weekday
  preference: 'PREFER' | 'AVOID'
}

/**
 * „Ich möchte freitags nach 13 Uhr keine Lehrveranstaltungen abhalten.“
 * „Ich möchte montags gern erst nach 13 Uhr …“ ist gleichbedeutend mit
 * „montags vor 13 Uhr keine …“ und wird ebenso abgebildet.
 */
export interface DayTimeWish {
  kind: 'DAY_TIME'
  weekday: Weekday
  /** Welcher Teil des Tages soll frei bleiben? */
  blocked: 'BEFORE' | 'AFTER'
  time: Minutes
}

/** „Ich möchte mittwochs nur von 10 bis 14 Uhr Lehrveranstaltungen abhalten.“ */
export interface DayRangeWish {
  kind: 'DAY_RANGE'
  weekday: Weekday
  /** Zeitraum, in dem gelehrt werden soll – davor und danach möglichst keine Lehre. */
  start: Minutes
  end: Minutes
}

/** „Ich möchte montags nur Online-Lehrveranstaltungen abhalten.“ */
export interface OnlineOnlyWish {
  kind: 'ONLINE_ONLY'
  weekday: Weekday
}

/** „Ich möchte maximal 4 Unterrichtsstunden pro Tag lehren.“ (mind. 4) */
export interface MaxUnitsWish {
  kind: 'MAX_UNITS_PER_DAY'
  units: number
}

export type ScheduleWish = DayWish | DayTimeWish | DayRangeWish | OnlineOnlyWish | MaxUnitsWish
export type WishKind = ScheduleWish['kind']

export type LastBlockAnswer = 'YES' | 'NO' | 'NO_WISH'

/**
 * „Wie im letzten Jahr“: Verweis auf den entsprechenden Theorieblock des Vorjahres.
 * resolved = true  → die Vorjahresangaben lagen vor und sind in dieser Einreichung enthalten.
 * resolved = false → lagen dem Formular nicht vor; die Hauptanwendung übernimmt sie selbst.
 */
export interface PreviousYearRef {
  blockId: string
  resolved: boolean
}

export interface FullTimeEntry {
  kind: 'FULL_TIME'
  /** Leeres Array = kein Terminwunsch (freie Einplanung). */
  wishes: ScheduleWish[]
  /** Mehr als ein Wunsch nur im begründeten Ausnahmefall nach Abstimmung mit dem Präsidium. */
  exceptionAgreedWithPresidium: boolean
  /**
   * Spalte 3 der bisherigen DMS-Tabelle: Wurde der Wunsch im letzten Theorieblock
   * berücksichtigt? null = noch nicht beantwortet.
   */
  wishConsideredLastBlock: LastBlockAnswer | null
  presidium: {
    isMember: boolean
    /** Wochentag der Präsidiumssitzungen – zählt nicht als Terminwunsch. */
    sessionWeekday: Weekday | null
  }
  /** Gesetzt, wenn der jeweilige Teil „wie im letzten Jahr“ beantwortet wurde. */
  sameAsPreviousYear: {
    wishes: PreviousYearRef | null
    presidium: PreviousYearRef | null
  }
}

// ---------------------------------------------------------------------------
// Freiberufliche und teilzeitbeschäftigte Dozierende (vorläufig: Wochenraster)
// ---------------------------------------------------------------------------

/** PREFERRED = verfügbar und am liebsten dann. */
export type GridMark = 'PREFERRED' | 'AVAILABLE' | 'ONLINE_ONLY' | 'UNAVAILABLE'

/** Raster: je Wochentag ein Eintrag pro Zeitslot (siehe PlanningConfig.slotMinutes). */
export type WeekGrid = Record<Weekday, GridMark[]>

/**
 * Abweichung an einem bestimmten Datum im Theorieblock (optional), z. B. „am 12.02. geht es
 * doch nicht“. Gilt nur für dieses Datum und geht dem Wochenraster vor.
 */
export interface DateException {
  /** ISO-Datum (YYYY-MM-DD) innerhalb des Theorieblocks */
  date: string
  mark: 'UNAVAILABLE' | 'AVAILABLE'
  /** null = ganztägig */
  time: { start: Minutes; end: Minutes } | null
}

export interface GridEntry {
  kind: 'FREELANCE' | 'PART_TIME'
  grid: WeekGrid
  /** Abweichungen an einzelnen Tagen, nach Datum sortiert. Leer = keine. */
  exceptions: DateException[]
  note: string
  /** Gesetzt, wenn die Zeiten „wie im letzten Jahr“ gelten sollen. */
  sameAsPreviousYear: PreviousYearRef | null
}

export type AvailabilityEntry = FullTimeEntry | GridEntry

// ---------------------------------------------------------------------------
// Einreichung und Planungsrahmen
// ---------------------------------------------------------------------------

export interface TheoryBlock {
  id: string
  label: string
  /** ISO-Datum (YYYY-MM-DD) */
  start: string
  end: string
  /** Bis wann Wünsche eingetragen werden können (ISO-Datum, inklusive). */
  submissionDeadline: string
  /** Entsprechender Theorieblock im Vorjahr – Grundlage für „wie im letzten Jahr“. */
  previousYearBlockId?: string
}

export interface LecturerData {
  lastName: string
  firstName: string
  email: string
}

// ---------------------------------------------------------------------------
// Ausgabe: Zeitfenster
// ---------------------------------------------------------------------------

export type WindowStatus = 'PREFERRED' | 'AVAILABLE' | 'ONLINE_ONLY' | 'UNAVAILABLE'

/**
 * HARD = darf der Solver nicht verletzen (Präsidiumssitzung, Freiberufler nicht da).
 * SOFT = Wunsch, soll nach Möglichkeit berücksichtigt werden (kein Anspruch).
 */
export type Hardness = 'HARD' | 'SOFT'

export type WindowSource =
  { type: 'WISH'; rank: number } | { type: 'PRESIDIUM' } | { type: 'GRID' } | { type: 'DEFAULT' }

export interface TimeWindow {
  weekday: Weekday
  start: Minutes
  end: Minutes
  status: WindowStatus
  hardness: Hardness
  source: WindowSource
}

/** Zeitfenster an einem bestimmten Datum – überschreibt dort die wöchentlichen Fenster. */
export interface DateWindow {
  date: string
  weekday: Weekday
  start: Minutes
  end: Minutes
  status: 'AVAILABLE' | 'UNAVAILABLE'
  hardness: 'HARD'
}

export interface AvailabilityResult {
  lecturerKind: LecturerKind
  /** Wöchentlich wiederkehrende Zeitfenster. */
  windows: TimeWindow[]
  /** Abweichungen an einzelnen Daten (nur Freiberufler/Teilzeit, sonst leer). */
  exceptions: DateWindow[]
  /** Tagesübergreifende Beschränkungen, die sich nicht als Zeitfenster ausdrücken lassen. */
  constraints: {
    maxUnitsPerDay: { units: number; hardness: Hardness } | null
  }
  /**
   * true, wenn der Wunsch im letzten Theorieblock nicht berücksichtigt wurde: Dann besteht
   * laut Merkblatt Anspruch auf bevorzugte Berücksichtigung im folgenden Theorieblock.
   */
  priorityClaim: boolean
  /**
   * true, wenn mindestens ein Teil „wie im letzten Jahr“ gewählt wurde, die Vorjahresangaben
   * dem Formular aber nicht vorlagen. Die Zeitfenster enthalten diesen Teil dann noch nicht –
   * die Hauptanwendung muss ihn aus der Vorjahreseinreichung übernehmen.
   */
  pendingPreviousYear: boolean
}

// ---------------------------------------------------------------------------
// Übergabeformat an die Hauptanwendung (Stundenplanung)
// ---------------------------------------------------------------------------

export const EXPORT_SCHEMA_VERSION = 2

export interface AvailabilityExport {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION
  /** ISO-Zeitstempel */
  submittedAt: string
  block: Pick<TheoryBlock, 'id' | 'label' | 'start' | 'end'>
  lecturer: LecturerData & { kind: LecturerKind }
  /** Die Antworten so, wie sie eingegeben wurden (für Nachvollziehbarkeit). */
  answers: AvailabilityEntry
  /** Daraus berechnete Zeitfenster – das, womit die Hauptanwendung plant. */
  result: AvailabilityResult
  /** Zeitraster, auf das sich alle Minutenangaben beziehen. */
  frame: { teachingDays: Weekday[]; dayStart: Minutes; dayEnd: Minutes; unitMinutes: number }
}

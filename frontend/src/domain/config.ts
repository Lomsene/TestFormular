import type { TheoryBlock, Weekday } from './types'

/**
 * Planungsrahmen. Diese Werte kommen später aus dem Backend (Admin-Einstellungen).
 * Offene Punkte mit der Stundenplanung klären: Lehrzeiten, Samstag ja/nein, Länge einer UE.
 */
export interface PlanningConfig {
  /** Wochentage, an denen Lehre stattfinden kann. */
  teachingDays: Weekday[]
  /** Beginn/Ende des Lehrtags in Minuten seit Mitternacht. */
  dayStart: number
  dayEnd: number
  /** Rasterweite für Uhrzeitauswahl und Wochenraster. */
  slotMinutes: number
  /** Länge einer Unterrichtsstunde (UE) in Minuten. */
  unitMinutes: number
  /** Untergrenze laut Merkblatt für die Stundenhöchstgrenze pro Tag. */
  minMaxUnitsPerDay: number
}

export const DEFAULT_CONFIG: PlanningConfig = {
  teachingDays: ['MO', 'TU', 'WE', 'TH', 'FR'],
  dayStart: 8 * 60,
  dayEnd: 18 * 60,
  slotMinutes: 30,
  unitMinutes: 45,
  minMaxUnitsPerDay: 4,
}

/** Beispiel-Theorieblöcke, bis die Daten aus dem Backend kommen. */
export const THEORY_BLOCKS: TheoryBlock[] = [
  {
    id: '2027-01',
    label: 'Theorieblock Januar bis März 2027',
    start: '2027-01-04',
    end: '2027-03-26',
    submissionDeadline: '2026-11-20',
    previousYearBlockId: '2026-01',
  },
  {
    id: '2026-10',
    label: 'Theorieblock Oktober bis Dezember 2026',
    start: '2026-10-05',
    end: '2026-12-18',
    submissionDeadline: '2026-09-18',
    previousYearBlockId: '2025-10',
  },
  {
    id: '2026-01',
    label: 'Theorieblock Januar bis März 2026',
    start: '2026-01-05',
    end: '2026-03-27',
    submissionDeadline: '2025-11-21',
    previousYearBlockId: '2025-01',
  },
]

/** Bezeichnung eines Blocks – auch für Vorjahresblöcke, die nicht mehr in der Liste stehen. */
export function blockLabel(id: string): string {
  const known = THEORY_BLOCKS.find((b) => b.id === id)
  if (known) return known.label
  const [year, month] = id.split('-')
  const season = { '01': 'Januar bis März', '10': 'Oktober bis Dezember' }[month ?? '']
  return season ? `Theorieblock ${season} ${year}` : `Theorieblock ${id}`
}

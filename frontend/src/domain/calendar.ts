import type { PlanningConfig } from './config'
import type { TheoryBlock, Weekday } from './types'

/**
 * Kalenderwochen eines Theorieblocks – Grundlage für Abweichungen an einzelnen Tagen.
 * Gerechnet wird in UTC, damit Zeitzone und Sommerzeit keine Tage verschieben.
 */

const DAY_MS = 24 * 60 * 60 * 1000
/** Reihenfolge ab Montag – Index = Tage seit Montag. */
const FROM_MONDAY: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function parse(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!)
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Wochentag eines Datums; null für Sonntag. */
export function weekdayOf(iso: string): Weekday | null {
  const day = new Date(parse(iso)).getUTCDay() // 0 = Sonntag
  return day === 0 ? null : FROM_MONDAY[day - 1]!
}

export interface BlockDay {
  date: string
  weekday: Weekday
  /** Liegt der Tag innerhalb von Beginn und Ende des Blocks? */
  inBlock: boolean
}

export interface BlockWeek {
  /** 1 = erste Woche des Blocks */
  number: number
  days: BlockDay[]
}

/** Alle Wochen des Blocks, je Woche die Lehrtage aus dem Planungsrahmen. */
export function blockWeeks(
  block: Pick<TheoryBlock, 'start' | 'end'>,
  config: PlanningConfig,
): BlockWeek[] {
  const start = parse(block.start)
  const end = parse(block.end)
  const offset = (new Date(start).getUTCDay() + 6) % 7 // Tage seit Montag
  const weeks: BlockWeek[] = []
  for (let monday = start - offset * DAY_MS; monday <= end; monday += 7 * DAY_MS) {
    weeks.push({
      number: weeks.length + 1,
      days: config.teachingDays.map((weekday) => {
        const ms = monday + FROM_MONDAY.indexOf(weekday) * DAY_MS
        return { date: toIso(ms), weekday, inBlock: ms >= start && ms <= end }
      }),
    })
  }
  return weeks
}

export function isInBlock(iso: string, block: Pick<TheoryBlock, 'start' | 'end'>): boolean {
  return iso >= block.start && iso <= block.end
}

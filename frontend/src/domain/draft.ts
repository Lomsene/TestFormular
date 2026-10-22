import type { PlanningConfig } from './config'
import type { ScheduleWish, Weekday } from './types'

/**
 * Bearbeitungszustand eines Wunsches im Formular – aufgebaut wie der Satz im Merkblatt:
 * „Ich möchte [montags] [keine Lehre].“ Erst der Tag, dann was an diesem Tag gelten soll.
 * „Jeden Tag“ lässt nur die Stundenhöchstgrenze zu (Merkblatt: kein Wunsch über mehrere Tage).
 *
 * Alle Felder bleiben beim Umschalten erhalten – so gehen Eingaben beim Ausprobieren nicht verloren.
 */
export type WishAnswer = 'NONE' | 'WISH' | 'SAME_AS_LAST_YEAR'

/** Was an dem gewählten Wochentag gelten soll. */
export type WishWhat = 'AVOID' | 'PREFER' | 'FROM' | 'UNTIL' | 'RANGE' | 'ONLINE'

export const EVERY_DAY = 'EVERY_DAY'

export interface WishDraft {
  /** „Haben Sie einen Terminwunsch?“ – nur beim ersten Wunsch gefragt, weitere sind immer WISH. */
  answer: WishAnswer | null
  day: Weekday | typeof EVERY_DAY | null
  what: WishWhat | null
  /** Uhrzeit bei „erst ab“ / „nur bis“, Beginn bei „von … bis“. */
  time: number
  /** Ende bei „von … bis“. */
  timeEnd: number
  units: number
}

export function newWishDraft(
  config: PlanningConfig,
  answer: WishDraft['answer'] = null,
): WishDraft {
  return {
    answer,
    day: null,
    what: null,
    time: Math.min(13 * 60, config.dayEnd - config.slotMinutes),
    timeEnd: Math.min(16 * 60, config.dayEnd),
    units: config.minMaxUnitsPerDay,
  }
}

/** Ein Entwurf ist erst ein Wunsch, wenn alles Nötige ausgewählt ist. */
export function draftToWish(d: WishDraft): ScheduleWish | null {
  if (d.answer !== 'WISH' || d.day === null) return null
  if (d.day === EVERY_DAY) return { kind: 'MAX_UNITS_PER_DAY', units: d.units }
  const weekday = d.day
  switch (d.what) {
    case 'AVOID':
    case 'PREFER':
      return { kind: 'DAY', weekday, preference: d.what }
    case 'FROM':
      return { kind: 'DAY_TIME', weekday, blocked: 'BEFORE', time: d.time }
    case 'UNTIL':
      return { kind: 'DAY_TIME', weekday, blocked: 'AFTER', time: d.time }
    case 'RANGE':
      return { kind: 'DAY_RANGE', weekday, start: d.time, end: d.timeEnd }
    case 'ONLINE':
      return { kind: 'ONLINE_ONLY', weekday }
    default:
      return null
  }
}

export function wishToDraft(wish: ScheduleWish, config: PlanningConfig): WishDraft {
  const d = newWishDraft(config, 'WISH')
  switch (wish.kind) {
    case 'DAY':
      return { ...d, day: wish.weekday, what: wish.preference }
    case 'DAY_TIME':
      return {
        ...d,
        day: wish.weekday,
        what: wish.blocked === 'BEFORE' ? 'FROM' : 'UNTIL',
        time: wish.time,
      }
    case 'DAY_RANGE':
      return { ...d, day: wish.weekday, what: 'RANGE', time: wish.start, timeEnd: wish.end }
    case 'ONLINE_ONLY':
      return { ...d, day: wish.weekday, what: 'ONLINE' }
    case 'MAX_UNITS_PER_DAY':
      return { ...d, day: EVERY_DAY, units: wish.units }
  }
}

/** Was fehlt noch? Feld (answer | day | what) und Meldung – null = vollständig. */
export function draftMissing(d: WishDraft): { field: string; message: string } | null {
  if (d.answer === null) {
    return { field: 'answer', message: 'Bitte wählen Sie aus, ob Sie einen Terminwunsch haben.' }
  }
  if (d.answer !== 'WISH') return null
  if (d.day === null) return { field: 'day', message: 'Bitte wählen Sie einen Wochentag.' }
  if (d.day !== EVERY_DAY && d.what === null) {
    return { field: 'what', message: 'Bitte wählen Sie, was an diesem Tag gelten soll.' }
  }
  return null
}

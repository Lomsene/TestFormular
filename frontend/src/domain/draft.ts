import type { PlanningConfig } from './config'
import type { ScheduleWish, Weekday, WishKind } from './types'

/**
 * Bearbeitungszustand eines Wunsches im Formular. Alle Felder bleiben erhalten, wenn
 * die Wunschart gewechselt wird – so gehen Eingaben beim Ausprobieren nicht verloren.
 */
export interface WishDraft {
  /** NONE = kein Wunsch, SAME_AS_LAST_YEAR = wie im letzten Jahr (nur beim ersten Wunsch). */
  kind: WishKind | 'NONE' | 'SAME_AS_LAST_YEAR' | null
  weekday: Weekday | null
  preference: 'PREFER' | 'AVOID'
  blocked: 'BEFORE' | 'AFTER'
  time: number
  units: number
}

export function newWishDraft(config: PlanningConfig, kind: WishDraft['kind'] = null): WishDraft {
  return {
    kind,
    weekday: null,
    preference: 'AVOID',
    blocked: 'AFTER',
    time: Math.min(13 * 60, config.dayEnd - config.slotMinutes),
    units: config.minMaxUnitsPerDay,
  }
}

/** Ein Entwurf ist erst ein Wunsch, wenn alles Nötige ausgewählt ist. */
export function draftToWish(d: WishDraft): ScheduleWish | null {
  switch (d.kind) {
    case 'DAY':
      return d.weekday ? { kind: 'DAY', weekday: d.weekday, preference: d.preference } : null
    case 'DAY_TIME':
      return d.weekday
        ? { kind: 'DAY_TIME', weekday: d.weekday, blocked: d.blocked, time: d.time }
        : null
    case 'ONLINE_ONLY':
      return d.weekday ? { kind: 'ONLINE_ONLY', weekday: d.weekday } : null
    case 'MAX_UNITS_PER_DAY':
      return { kind: 'MAX_UNITS_PER_DAY', units: d.units }
    default:
      return null
  }
}

export function wishToDraft(wish: ScheduleWish, config: PlanningConfig): WishDraft {
  return { ...newWishDraft(config), ...wish }
}

/** Was fehlt noch, damit aus dem Entwurf ein Wunsch wird? (null = vollständig) */
export function draftMissing(d: WishDraft): string | null {
  if (d.kind === null) return 'Bitte wählen Sie aus, welche Art von Wunsch Sie haben.'
  if (d.kind === 'NONE' || d.kind === 'SAME_AS_LAST_YEAR' || d.kind === 'MAX_UNITS_PER_DAY') {
    return null
  }
  return d.weekday ? null : 'Bitte wählen Sie einen Wochentag.'
}

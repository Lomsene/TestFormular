import type { Minutes, ScheduleWish, Weekday, WindowStatus } from './types'

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  MO: 'Montag',
  TU: 'Dienstag',
  WE: 'Mittwoch',
  TH: 'Donnerstag',
  FR: 'Freitag',
  SA: 'Samstag',
}

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  MO: 'Mo',
  TU: 'Di',
  WE: 'Mi',
  TH: 'Do',
  FR: 'Fr',
  SA: 'Sa',
}

/** „montags“, „dienstags“ … für Wunschformulierungen. */
export const WEEKDAY_ADVERB: Record<Weekday, string> = {
  MO: 'montags',
  TU: 'dienstags',
  WE: 'mittwochs',
  TH: 'donnerstags',
  FR: 'freitags',
  SA: 'samstags',
}

export const STATUS_LABEL: Record<WindowStatus, string> = {
  PREFERRED: 'Bevorzugt',
  AVAILABLE: 'Verfügbar',
  ONLINE_ONLY: 'Nur online',
  UNAVAILABLE: 'Nicht verfügbar',
}

export function formatTime(minutes: Minutes): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** „13 Uhr“ bzw. „13:30 Uhr“ – so wie man es sagen würde. */
export function formatClock(minutes: Minutes): string {
  const m = minutes % 60
  return m === 0 ? `${Math.floor(minutes / 60)} Uhr` : `${formatTime(minutes)} Uhr`
}

/** Wunsch als Satz in der Sprache des Merkblatts („Ich möchte …“). */
export function describeWish(wish: ScheduleWish): string {
  switch (wish.kind) {
    case 'DAY':
      return wish.preference === 'AVOID'
        ? `Ich möchte ${WEEKDAY_ADVERB[wish.weekday]} keine Lehrveranstaltungen abhalten.`
        : `Ich möchte gern ${WEEKDAY_ADVERB[wish.weekday]} Lehrveranstaltungen abhalten.`
    case 'DAY_TIME':
      return wish.blocked === 'BEFORE'
        ? `Ich möchte ${WEEKDAY_ADVERB[wish.weekday]} erst ab ${formatClock(wish.time)} Lehrveranstaltungen abhalten.`
        : `Ich möchte ${WEEKDAY_ADVERB[wish.weekday]} ab ${formatClock(wish.time)} keine Lehrveranstaltungen abhalten.`
    case 'DAY_RANGE':
      return `Ich möchte ${WEEKDAY_ADVERB[wish.weekday]} nur von ${formatClock(wish.start)} bis ${formatClock(wish.end)} Lehrveranstaltungen abhalten.`
    case 'ONLINE_ONLY':
      return `Ich möchte ${WEEKDAY_ADVERB[wish.weekday]} nur Online-Lehrveranstaltungen abhalten.`
    case 'MAX_UNITS_PER_DAY':
      return `Ich möchte maximal ${wish.units} Unterrichtsstunden pro Tag lehren.`
  }
}

/** Kurzform für Tabellen, angelehnt an die DMS-Tabelle („dienstags nie“). */
export function describeWishShort(wish: ScheduleWish): string {
  switch (wish.kind) {
    case 'DAY':
      return wish.preference === 'AVOID'
        ? `${WEEKDAY_ADVERB[wish.weekday]} nie`
        : `gerne ${WEEKDAY_ADVERB[wish.weekday]}`
    case 'DAY_TIME':
      return wish.blocked === 'BEFORE'
        ? `${WEEKDAY_ADVERB[wish.weekday]} erst ab ${formatClock(wish.time)}`
        : `${WEEKDAY_ADVERB[wish.weekday]} nicht ab ${formatClock(wish.time)}`
    case 'DAY_RANGE':
      return `${WEEKDAY_ADVERB[wish.weekday]} nur ${formatTime(wish.start)}–${formatTime(wish.end)} Uhr`
    case 'ONLINE_ONLY':
      return `${WEEKDAY_ADVERB[wish.weekday]} nur online`
    case 'MAX_UNITS_PER_DAY':
      return `maximal ${wish.units} UE täglich`
  }
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

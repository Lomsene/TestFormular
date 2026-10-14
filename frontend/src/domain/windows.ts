import type { PlanningConfig } from './config'
import type {
  AvailabilityEntry,
  AvailabilityResult,
  FullTimeEntry,
  GridEntry,
  GridMark,
  Hardness,
  Minutes,
  ScheduleWish,
  TimeWindow,
  Weekday,
  WeekGrid,
  WindowSource,
  WindowStatus,
} from './types'

/**
 * Rechnet die Antworten aus dem Formular in Zeitfenster je Wochentag um.
 *
 * Vorgehen: Jeder Lehrtag wird in Slots (config.slotMinutes) zerlegt. Darauf werden die
 * Ebenen nacheinander „gemalt“ – Grundzustand, dann Wünsche, zuletzt verbindliche
 * Termine. Anschließend werden benachbarte gleiche Slots zu Zeitfenstern zusammengefasst.
 * Die Fenster decken jeden Lehrtag lückenlos von dayStart bis dayEnd ab.
 */
export function computeAvailability(
  entry: AvailabilityEntry,
  config: PlanningConfig,
): AvailabilityResult {
  return entry.kind === 'FULL_TIME' ? fromFullTime(entry, config) : fromGrid(entry, config)
}

interface Cell {
  status: WindowStatus
  hardness: Hardness
  source: WindowSource
}

type DayCells = Map<Weekday, Cell[]>

export function slotCount(config: PlanningConfig): number {
  return Math.ceil((config.dayEnd - config.dayStart) / config.slotMinutes)
}

function slotStart(index: number, config: PlanningConfig): Minutes {
  return config.dayStart + index * config.slotMinutes
}

function paint(
  days: DayCells,
  weekday: Weekday,
  from: Minutes,
  to: Minutes,
  cell: Cell,
  config: PlanningConfig,
): void {
  const cells = days.get(weekday)
  if (!cells) return // kein Lehrtag
  cells.forEach((_, i) => {
    const start = slotStart(i, config)
    if (start >= from && start < to) cells[i] = { ...cell }
  })
}

function applyWish(days: DayCells, wish: ScheduleWish, rank: number, config: PlanningConfig) {
  const source: WindowSource = { type: 'WISH', rank }
  const soft = (status: WindowStatus): Cell => ({ status, hardness: 'SOFT', source })
  const { dayStart, dayEnd } = config

  switch (wish.kind) {
    case 'DAY':
      paint(days, wish.weekday, dayStart, dayEnd, soft(wish.preference === 'PREFER' ? 'PREFERRED' : 'UNAVAILABLE'), config)
      break
    case 'DAY_TIME':
      if (wish.blocked === 'BEFORE') {
        paint(days, wish.weekday, dayStart, wish.time, soft('UNAVAILABLE'), config)
      } else {
        paint(days, wish.weekday, wish.time, dayEnd, soft('UNAVAILABLE'), config)
      }
      break
    case 'ONLINE_ONLY':
      paint(days, wish.weekday, dayStart, dayEnd, soft('ONLINE_ONLY'), config)
      break
    case 'MAX_UNITS_PER_DAY':
      break // keine Zeitfenster, sondern eine tagesbezogene Beschränkung
  }
}

function fromFullTime(entry: FullTimeEntry, config: PlanningConfig): AvailabilityResult {
  const days: DayCells = new Map(
    config.teachingDays.map((d) => [
      d,
      Array.from({ length: slotCount(config) }, (): Cell => ({
        status: 'AVAILABLE',
        hardness: 'HARD',
        source: { type: 'DEFAULT' },
      })),
    ]),
  )

  // Rückwärts malen: Bei Widersprüchen setzt sich der zuerst genannte Wunsch durch.
  for (let i = entry.wishes.length - 1; i >= 0; i--) {
    applyWish(days, entry.wishes[i]!, i + 1, config)
  }

  // Präsidiumssitzungen sind verbindlich und überschreiben alles.
  const { presidium } = entry
  if (presidium.isMember && presidium.sessionWeekday) {
    paint(
      days,
      presidium.sessionWeekday,
      config.dayStart,
      config.dayEnd,
      { status: 'UNAVAILABLE', hardness: 'HARD', source: { type: 'PRESIDIUM' } },
      config,
    )
  }

  const maxUnits = entry.wishes.find((w) => w.kind === 'MAX_UNITS_PER_DAY')

  return {
    lecturerKind: 'FULL_TIME',
    windows: mergeCells(days, config),
    constraints: {
      maxUnitsPerDay: maxUnits ? { units: maxUnits.units, hardness: 'SOFT' } : null,
    },
    priorityClaim: entry.wishConsideredLastBlock === 'NO',
  }
}

const GRID_STATUS: Record<GridMark, WindowStatus> = {
  AVAILABLE: 'AVAILABLE',
  ONLINE_ONLY: 'ONLINE_ONLY',
  UNAVAILABLE: 'UNAVAILABLE',
}

function fromGrid(entry: GridEntry, config: PlanningConfig): AvailabilityResult {
  const days: DayCells = new Map(
    config.teachingDays.map((d) => [
      d,
      Array.from({ length: slotCount(config) }, (_, i): Cell => ({
        status: GRID_STATUS[entry.grid[d]?.[i] ?? 'UNAVAILABLE'],
        hardness: 'HARD',
        source: { type: 'GRID' },
      })),
    ]),
  )
  return {
    lecturerKind: entry.kind,
    windows: mergeCells(days, config),
    constraints: { maxUnitsPerDay: null },
    priorityClaim: false,
  }
}

function sameCell(a: Cell, b: Cell): boolean {
  return (
    a.status === b.status &&
    a.hardness === b.hardness &&
    JSON.stringify(a.source) === JSON.stringify(b.source)
  )
}

function mergeCells(days: DayCells, config: PlanningConfig): TimeWindow[] {
  const windows: TimeWindow[] = []
  for (const weekday of config.teachingDays) {
    const cells = days.get(weekday) ?? []
    let current: TimeWindow | null = null
    cells.forEach((cell, i) => {
      const start = slotStart(i, config)
      const end = Math.min(start + config.slotMinutes, config.dayEnd)
      if (current && sameCell(current, cell)) {
        current.end = end
      } else {
        current = { weekday, start, end, ...cell }
        windows.push(current)
      }
    })
  }
  return windows
}

/** Leeres Raster: alles „nicht verfügbar“ – Freiberufler markieren, wann sie können. */
export function emptyGrid(config: PlanningConfig, mark: GridMark = 'UNAVAILABLE'): WeekGrid {
  const grid = {} as WeekGrid
  for (const d of ['MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const) {
    grid[d] = Array.from({ length: slotCount(config) }, () => mark)
  }
  return grid
}

import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import type { FullTimeEntry, ScheduleWish, TimeWindow } from './types'
import { computeAvailability, emptyGrid } from './windows'

const cfg = DEFAULT_CONFIG // Mo–Fr, 08:00–18:00, 30-Minuten-Raster
const H = (h: number) => h * 60

function fullTime(wishes: ScheduleWish[], extra: Partial<FullTimeEntry> = {}): FullTimeEntry {
  return {
    kind: 'FULL_TIME',
    wishes,
    exceptionAgreedWithPresidium: false,
    wishConsideredLastBlock: 'YES',
    presidium: { isMember: false, sessionWeekday: null },
    ...extra,
  }
}

const strip = (w: TimeWindow) => [w.weekday, w.start, w.end, w.status, w.hardness]

describe('computeAvailability – hauptamtlich', () => {
  it('ohne Wunsch: jeder Lehrtag ganztägig verfügbar', () => {
    const r = computeAvailability(fullTime([]), cfg)
    expect(r.windows.map(strip)).toEqual(
      cfg.teachingDays.map((d) => [d, H(8), H(18), 'AVAILABLE', 'HARD']),
    )
    expect(r.constraints.maxUnitsPerDay).toBeNull()
  })

  it('„dienstags nie“ sperrt Dienstag weich', () => {
    const r = computeAvailability(fullTime([{ kind: 'DAY', weekday: 'TU', preference: 'AVOID' }]), cfg)
    const tu = r.windows.filter((w) => w.weekday === 'TU')
    expect(tu.map(strip)).toEqual([['TU', H(8), H(18), 'UNAVAILABLE', 'SOFT']])
    expect(tu[0]!.source).toEqual({ type: 'WISH', rank: 1 })
  })

  it('„gerne freitags“ markiert Freitag als bevorzugt', () => {
    const r = computeAvailability(fullTime([{ kind: 'DAY', weekday: 'FR', preference: 'PREFER' }]), cfg)
    expect(r.windows.find((w) => w.weekday === 'FR')!.status).toBe('PREFERRED')
  })

  it('„freitags ab 13 Uhr keine“ teilt den Tag', () => {
    const r = computeAvailability(
      fullTime([{ kind: 'DAY_TIME', weekday: 'FR', blocked: 'AFTER', time: H(13) }]),
      cfg,
    )
    expect(r.windows.filter((w) => w.weekday === 'FR').map(strip)).toEqual([
      ['FR', H(8), H(13), 'AVAILABLE', 'HARD'],
      ['FR', H(13), H(18), 'UNAVAILABLE', 'SOFT'],
    ])
  })

  it('„montags erst ab 13:30 Uhr“ sperrt den Vormittag', () => {
    const r = computeAvailability(
      fullTime([{ kind: 'DAY_TIME', weekday: 'MO', blocked: 'BEFORE', time: H(13) + 30 }]),
      cfg,
    )
    expect(r.windows.filter((w) => w.weekday === 'MO').map(strip)).toEqual([
      ['MO', H(8), H(13) + 30, 'UNAVAILABLE', 'SOFT'],
      ['MO', H(13) + 30, H(18), 'AVAILABLE', 'HARD'],
    ])
  })

  it('„montags nur online“', () => {
    const r = computeAvailability(fullTime([{ kind: 'ONLINE_ONLY', weekday: 'MO' }]), cfg)
    expect(r.windows.find((w) => w.weekday === 'MO')!.status).toBe('ONLINE_ONLY')
  })

  it('Stundenhöchstgrenze wird als Beschränkung ausgegeben, nicht als Fenster', () => {
    const r = computeAvailability(fullTime([{ kind: 'MAX_UNITS_PER_DAY', units: 4 }]), cfg)
    expect(r.constraints.maxUnitsPerDay).toEqual({ units: 4, hardness: 'SOFT' })
    expect(r.windows.every((w) => w.status === 'AVAILABLE')).toBe(true)
  })

  it('Präsidiumssitzung sperrt hart und überschreibt Wünsche', () => {
    const r = computeAvailability(
      fullTime([{ kind: 'DAY', weekday: 'WE', preference: 'PREFER' }], {
        exceptionAgreedWithPresidium: true,
        presidium: { isMember: true, sessionWeekday: 'WE' },
      }),
      cfg,
    )
    const we = r.windows.filter((w) => w.weekday === 'WE')
    expect(we.map(strip)).toEqual([['WE', H(8), H(18), 'UNAVAILABLE', 'HARD']])
    expect(we[0]!.source).toEqual({ type: 'PRESIDIUM' })
  })

  it('bei Widersprüchen gilt der zuerst genannte Wunsch', () => {
    const r = computeAvailability(
      fullTime(
        [
          { kind: 'DAY', weekday: 'TH', preference: 'AVOID' },
          { kind: 'ONLINE_ONLY', weekday: 'TH' },
        ],
        { exceptionAgreedWithPresidium: true },
      ),
      cfg,
    )
    const th = r.windows.filter((w) => w.weekday === 'TH')
    expect(th.map(strip)).toEqual([['TH', H(8), H(18), 'UNAVAILABLE', 'SOFT']])
    expect(th[0]!.source).toEqual({ type: 'WISH', rank: 1 })
  })

  it('Anspruch auf bevorzugte Berücksichtigung, wenn letzter Wunsch nicht erfüllt', () => {
    expect(computeAvailability(fullTime([], { wishConsideredLastBlock: 'NO' }), cfg).priorityClaim).toBe(true)
    expect(computeAvailability(fullTime([], { wishConsideredLastBlock: 'YES' }), cfg).priorityClaim).toBe(false)
    expect(computeAvailability(fullTime([], { wishConsideredLastBlock: 'NO_WISH' }), cfg).priorityClaim).toBe(false)
  })

  it('Fenster decken jeden Lehrtag lückenlos ab', () => {
    const r = computeAvailability(
      fullTime([{ kind: 'DAY_TIME', weekday: 'TU', blocked: 'AFTER', time: H(10) }]),
      cfg,
    )
    for (const d of cfg.teachingDays) {
      const ws = r.windows.filter((w) => w.weekday === d)
      expect(ws[0]!.start).toBe(cfg.dayStart)
      expect(ws.at(-1)!.end).toBe(cfg.dayEnd)
      ws.slice(1).forEach((w, i) => expect(w.start).toBe(ws[i]!.end))
    }
  })
})

describe('computeAvailability – Raster (Freiberufler/Teilzeit)', () => {
  it('fasst markierte Slots zu harten Zeitfenstern zusammen', () => {
    const grid = emptyGrid(cfg)
    // Mittwoch 09:00–12:00 verfügbar (Slots 2–7), 12:00–13:00 nur online (Slots 8–9)
    for (let i = 2; i < 8; i++) grid.WE[i] = 'AVAILABLE'
    grid.WE[8] = 'ONLINE_ONLY'
    grid.WE[9] = 'ONLINE_ONLY'
    const r = computeAvailability({ kind: 'FREELANCE', grid, note: '' }, cfg)
    expect(r.lecturerKind).toBe('FREELANCE')
    expect(r.windows.filter((w) => w.weekday === 'WE').map(strip)).toEqual([
      ['WE', H(8), H(9), 'UNAVAILABLE', 'HARD'],
      ['WE', H(9), H(12), 'AVAILABLE', 'HARD'],
      ['WE', H(12), H(13), 'ONLINE_ONLY', 'HARD'],
      ['WE', H(13), H(18), 'UNAVAILABLE', 'HARD'],
    ])
  })
})

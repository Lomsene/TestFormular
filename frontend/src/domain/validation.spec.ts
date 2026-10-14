import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import type { FullTimeEntry, ScheduleWish } from './types'
import { hasErrors, validateEntry, validateLecturer } from './validation'
import { emptyGrid } from './windows'

const cfg = DEFAULT_CONFIG

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

const fields = (entry: FullTimeEntry) =>
  validateEntry(entry, cfg)
    .filter((i) => i.severity === 'error')
    .map((i) => i.field)

describe('Merkblatt-Regeln (hauptamtlich)', () => {
  it('kein Wunsch ist zulässig', () => {
    expect(fields(fullTime([]))).toEqual([])
  })

  it.each<ScheduleWish>([
    { kind: 'DAY', weekday: 'MO', preference: 'AVOID' },
    { kind: 'DAY', weekday: 'FR', preference: 'PREFER' },
    { kind: 'DAY_TIME', weekday: 'MO', blocked: 'BEFORE', time: 13 * 60 },
    { kind: 'DAY_TIME', weekday: 'FR', blocked: 'AFTER', time: 13 * 60 },
    { kind: 'ONLINE_ONLY', weekday: 'MO' },
    { kind: 'MAX_UNITS_PER_DAY', units: 4 },
  ])('Beispiel aus dem Merkblatt ist zulässig: %o', (wish) => {
    expect(fields(fullTime([wish]))).toEqual([])
  })

  it('mehrere Wünsche nur nach Abstimmung mit dem Präsidium', () => {
    const wishes: ScheduleWish[] = [
      { kind: 'DAY', weekday: 'MO', preference: 'AVOID' },
      { kind: 'DAY', weekday: 'FR', preference: 'AVOID' },
    ]
    expect(fields(fullTime(wishes))).toContain('exception')
    expect(fields(fullTime(wishes, { exceptionAgreedWithPresidium: true }))).toEqual([])
  })

  it('Höchstgrenze unter 4 UE ist unzulässig', () => {
    expect(fields(fullTime([{ kind: 'MAX_UNITS_PER_DAY', units: 3 }]))).toEqual(['wish.0.units'])
  })

  it('Höchstgrenze + Tageswunsch ergibt immer einen Hinweis', () => {
    const issues = validateEntry(
      fullTime(
        [
          { kind: 'MAX_UNITS_PER_DAY', units: 6 },
          { kind: 'DAY', weekday: 'FR', preference: 'AVOID' },
        ],
        { exceptionAgreedWithPresidium: true },
      ),
      cfg,
    )
    expect(hasErrors(issues)).toBe(false)
    expect(issues.some((i) => i.severity === 'warning' && i.field === 'exception')).toBe(true)
  })

  it('Uhrzeit muss innerhalb des Lehrtags und im Raster liegen', () => {
    const at = (time: number) =>
      fields(fullTime([{ kind: 'DAY_TIME', weekday: 'MO', blocked: 'AFTER', time }]))
    expect(at(8 * 60)).toEqual(['wish.0.time'])
    expect(at(18 * 60)).toEqual(['wish.0.time'])
    expect(at(13 * 60 + 10)).toEqual(['wish.0.time'])
    expect(at(13 * 60 + 30)).toEqual([])
  })

  it('Samstag ist kein Lehrtag (Standardkonfiguration)', () => {
    expect(fields(fullTime([{ kind: 'DAY', weekday: 'SA', preference: 'AVOID' }]))).toEqual([
      'wish.0.weekday',
    ])
  })

  it('Präsidiumsmitglied muss Sitzungstag angeben', () => {
    expect(fields(fullTime([], { presidium: { isMember: true, sessionWeekday: null } }))).toEqual([
      'presidium.sessionWeekday',
    ])
  })

  it('„gern am Sitzungstag“ ist ein Widerspruch', () => {
    expect(
      fields(
        fullTime([{ kind: 'DAY', weekday: 'WE', preference: 'PREFER' }], {
          presidium: { isMember: true, sessionWeekday: 'WE' },
        }),
      ),
    ).toEqual(['wish.0.weekday'])
  })

  it('Frage nach dem letzten Theorieblock muss beantwortet werden', () => {
    expect(fields(fullTime([], { wishConsideredLastBlock: null }))).toEqual(['lastBlock'])
  })
})

describe('Raster', () => {
  it('komplett leeres Raster ist ein Fehler', () => {
    expect(hasErrors(validateEntry({ kind: 'FREELANCE', grid: emptyGrid(cfg), note: '' }, cfg))).toBe(true)
  })
})

describe('Personendaten', () => {
  it('prüft Pflichtfelder und E-Mail', () => {
    expect(validateLecturer({ lastName: '', firstName: 'A', email: 'x' }).map((i) => i.field)).toEqual([
      'lastName',
      'email',
    ])
    expect(validateLecturer({ lastName: 'Müller', firstName: 'Max', email: 'max@dhsh.de' })).toEqual([])
  })
})

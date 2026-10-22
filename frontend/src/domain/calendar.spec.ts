import { describe, expect, it } from 'vitest'
import { blockWeeks, weekdayOf } from './calendar'
import { DEFAULT_CONFIG } from './config'

describe('Kalender des Theorieblocks', () => {
  it('bestimmt den Wochentag unabhängig von der Zeitzone', () => {
    expect(weekdayOf('2027-01-04')).toBe('MO')
    expect(weekdayOf('2027-03-28')).toBeNull() // Sonntag
  })

  it('zerlegt den Block in Wochen mit den Lehrtagen', () => {
    const weeks = blockWeeks({ start: '2027-01-04', end: '2027-03-12' }, DEFAULT_CONFIG)
    expect(weeks).toHaveLength(10)
    expect(weeks[0]!.days.map((d) => d.date)).toEqual([
      '2027-01-04',
      '2027-01-05',
      '2027-01-06',
      '2027-01-07',
      '2027-01-08',
    ])
    expect(weeks[9]!.days.at(-1)!.date).toBe('2027-03-12')
  })

  it('markiert Tage vor Beginn bzw. nach Ende als außerhalb', () => {
    const weeks = blockWeeks({ start: '2026-10-07', end: '2026-10-13' }, DEFAULT_CONFIG)
    expect(weeks).toHaveLength(2)
    expect(weeks[0]!.days.map((d) => d.inBlock)).toEqual([false, false, true, true, true])
    expect(weeks[1]!.days.map((d) => d.inBlock)).toEqual([true, true, false, false, false])
  })
})

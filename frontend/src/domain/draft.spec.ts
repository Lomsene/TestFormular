import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { EVERY_DAY, draftMissing, draftToWish, newWishDraft, wishToDraft } from './draft'
import type { ScheduleWish } from './types'

const cfg = DEFAULT_CONFIG

describe('Wunsch-Entwurf (Satzbaukasten)', () => {
  it('fragt der Reihe nach: Wunsch? → Tag → was', () => {
    const d = newWishDraft(cfg)
    expect(draftMissing(d)?.field).toBe('answer')
    d.answer = 'WISH'
    expect(draftMissing(d)?.field).toBe('day')
    d.day = 'MO'
    expect(draftMissing(d)?.field).toBe('what')
    d.what = 'AVOID'
    expect(draftMissing(d)).toBeNull()
    expect(draftToWish(d)).toEqual({ kind: 'DAY', weekday: 'MO', preference: 'AVOID' })
  })

  it('„Jeden Tag“ ist die Stundenhöchstgrenze und braucht keine weitere Angabe', () => {
    const d = { ...newWishDraft(cfg, 'WISH'), day: EVERY_DAY, units: 5 } as const
    expect(draftMissing(d)).toBeNull()
    expect(draftToWish(d)).toEqual({ kind: 'MAX_UNITS_PER_DAY', units: 5 })
  })

  it('„kein Wunsch“ ergibt keinen Wunsch, ist aber vollständig', () => {
    const d = newWishDraft(cfg, 'NONE')
    expect(draftMissing(d)).toBeNull()
    expect(draftToWish(d)).toBeNull()
  })

  it('jede Wunschform lässt sich verlustfrei bearbeiten (Hin- und Rückweg)', () => {
    const wishes: ScheduleWish[] = [
      { kind: 'DAY', weekday: 'FR', preference: 'PREFER' },
      { kind: 'DAY_TIME', weekday: 'MO', blocked: 'BEFORE', time: 600 },
      { kind: 'DAY_TIME', weekday: 'FR', blocked: 'AFTER', time: 780 },
      { kind: 'DAY_RANGE', weekday: 'TH', start: 600, end: 840 },
      { kind: 'ONLINE_ONLY', weekday: 'WE' },
      { kind: 'MAX_UNITS_PER_DAY', units: 6 },
    ]
    for (const w of wishes) expect(draftToWish(wishToDraft(w, cfg))).toEqual(w)
  })
})

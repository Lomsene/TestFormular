import { describe, expect, it } from 'vitest'
import { stepOfField } from './useAvailabilityForm'

describe('Meldung → Schritt (Terminwunsch Schritt für Schritt)', () => {
  it('ordnet die Fragen des ersten Wunsches ihren Schritten zu', () => {
    expect(stepOfField('wish.0.answer')).toBe('wish')
    expect(stepOfField('wish.0.day')).toBe('wishDay')
    expect(stepOfField('wish.0.weekday')).toBe('wishDay')
    expect(stepOfField('wish.0.what')).toBe('wishWhat')
    expect(stepOfField('wish.0.time')).toBe('wishWhat')
    expect(stepOfField('wish.0.units')).toBe('wishWhat')
  })

  it('weitere Wünsche und die Präsidiums-Abstimmung gehören zu „Was genau?“', () => {
    expect(stepOfField('wish.1.weekday')).toBe('wishWhat')
    expect(stepOfField('exception')).toBe('wishWhat')
  })

  it('übrige Felder bleiben wie gehabt', () => {
    expect(stepOfField('email')).toBe('person')
    expect(stepOfField('presidium.sessionWeekday')).toBe('details')
    expect(stepOfField('exceptions.0')).toBe('grid')
  })
})

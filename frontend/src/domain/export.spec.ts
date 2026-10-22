import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, THEORY_BLOCKS } from './config'
import { buildExport, exportFileName } from './export'

describe('Übergabeformat', () => {
  const data = buildExport(
    { lastName: ' Großmann ', firstName: 'Jürgen', email: ' J.Grossmann@DHSH.de ' },
    THEORY_BLOCKS[0]!,
    {
      kind: 'FULL_TIME',
      wishes: [{ kind: 'DAY', weekday: 'MO', preference: 'AVOID' }],
      exceptionAgreedWithPresidium: false,
      wishConsideredLastBlock: 'NO',
      presidium: { isMember: false, sessionWeekday: null },
      sameAsPreviousYear: { wishes: null, presidium: null },
    },
    DEFAULT_CONFIG,
    new Date('2026-10-14T10:00:00Z'),
  )

  it('normalisiert Personendaten und enthält Antworten und Zeitfenster', () => {
    expect(data.schemaVersion).toBe(2)
    expect(data.lecturer).toEqual({
      lastName: 'Großmann',
      firstName: 'Jürgen',
      email: 'j.grossmann@dhsh.de',
      kind: 'FULL_TIME',
    })
    expect(data.submittedAt).toBe('2026-10-14T10:00:00.000Z')
    expect(data.result.priorityClaim).toBe(true)
    expect(data.result.windows.length).toBe(DEFAULT_CONFIG.teachingDays.length)
  })

  it('erzeugt einen dateisystemtauglichen Dateinamen', () => {
    expect(exportFileName(data)).toBe('verfuegbarkeit_2027-01_Grossmann_Jurgen.json')
  })
})

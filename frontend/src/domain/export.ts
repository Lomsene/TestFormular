import type { PlanningConfig } from './config'
import type { AvailabilityEntry, AvailabilityExport, LecturerData, TheoryBlock } from './types'
import { EXPORT_SCHEMA_VERSION } from './types'
import { computeAvailability } from './windows'

/** Baut das Übergabedokument für die Hauptanwendung (siehe docs/datenformat.md). */
export function buildExport(
  lecturer: LecturerData,
  block: TheoryBlock,
  entry: AvailabilityEntry,
  config: PlanningConfig,
  now: Date = new Date(),
): AvailabilityExport {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    submittedAt: now.toISOString(),
    block: { id: block.id, label: block.label, start: block.start, end: block.end },
    lecturer: {
      lastName: lecturer.lastName.trim(),
      firstName: lecturer.firstName.trim(),
      email: lecturer.email.trim().toLowerCase(),
      kind: entry.kind,
    },
    answers: entry,
    result: computeAvailability(entry, config),
    frame: {
      teachingDays: [...config.teachingDays],
      dayStart: config.dayStart,
      dayEnd: config.dayEnd,
      unitMinutes: config.unitMinutes,
    },
  }
}

export function exportFileName(data: AvailabilityExport): string {
  const safe = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  return `verfuegbarkeit_${data.block.id}_${safe(data.lecturer.lastName)}_${safe(data.lecturer.firstName)}.json`
}

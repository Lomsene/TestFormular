import type { PlanningConfig } from './config'
import { WEEKDAY_ADVERB, capitalize, formatClock } from './format'
import type {
  AvailabilityEntry,
  FullTimeEntry,
  GridEntry,
  LecturerData,
  ScheduleWish,
} from './types'

/**
 * Prüfregeln aus dem Merkblatt „Terminwünsche Stundenplanung“.
 * Fehler (error) verhindern das Absenden, Hinweise (warning) nicht.
 */
export interface Issue {
  severity: 'error' | 'warning'
  /** Formularfeld, an dem die Meldung angezeigt wird (z. B. "wish.0.time"). */
  field: string
  message: string
}

/** Begründete Ausnahmefälle: mehr als ein Wunsch – aber nicht beliebig viele. */
export const MAX_WISHES_WITH_EXCEPTION = 3

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function maxUnitsUpperBound(config: PlanningConfig): number {
  return Math.floor((config.dayEnd - config.dayStart) / config.unitMinutes)
}

export function validateLecturer(lecturer: LecturerData): Issue[] {
  const issues: Issue[] = []
  if (!lecturer.lastName.trim()) {
    issues.push({
      severity: 'error',
      field: 'lastName',
      message: 'Bitte geben Sie Ihren Nachnamen an.',
    })
  }
  if (!lecturer.firstName.trim()) {
    issues.push({
      severity: 'error',
      field: 'firstName',
      message: 'Bitte geben Sie Ihren Vornamen an.',
    })
  }
  if (!lecturer.email.trim()) {
    issues.push({
      severity: 'error',
      field: 'email',
      message: 'Bitte geben Sie Ihre E-Mail-Adresse an.',
    })
  } else if (!EMAIL_PATTERN.test(lecturer.email.trim())) {
    issues.push({
      severity: 'error',
      field: 'email',
      message: 'Die E-Mail-Adresse sieht unvollständig aus (Beispiel: name@dhsh.de).',
    })
  }
  return issues
}

export function validateEntry(entry: AvailabilityEntry, config: PlanningConfig): Issue[] {
  return entry.kind === 'FULL_TIME' ? validateFullTime(entry, config) : validateGrid(entry)
}

function validateWish(wish: ScheduleWish, index: number, config: PlanningConfig): Issue[] {
  const issues: Issue[] = []
  const at = (name: string) => `wish.${index}.${name}`

  if ('weekday' in wish && !config.teachingDays.includes(wish.weekday)) {
    issues.push({
      severity: 'error',
      field: at('weekday'),
      message: 'An diesem Wochentag findet keine Lehre statt.',
    })
  }

  if (wish.kind === 'DAY_TIME') {
    const onGrid = (wish.time - config.dayStart) % config.slotMinutes === 0
    if (wish.time <= config.dayStart || wish.time >= config.dayEnd || !onGrid) {
      issues.push({
        severity: 'error',
        field: at('time'),
        message: `Bitte wählen Sie eine Uhrzeit zwischen ${formatClock(config.dayStart)} und ${formatClock(config.dayEnd)}.`,
      })
    }
  }

  if (wish.kind === 'MAX_UNITS_PER_DAY') {
    const upper = maxUnitsUpperBound(config)
    if (!Number.isInteger(wish.units)) {
      issues.push({
        severity: 'error',
        field: at('units'),
        message: 'Bitte eine ganze Zahl angeben.',
      })
    } else if (wish.units < config.minMaxUnitsPerDay) {
      issues.push({
        severity: 'error',
        field: at('units'),
        message: `Die Höchstgrenze darf nicht unter ${config.minMaxUnitsPerDay} Unterrichtsstunden liegen.`,
      })
    } else if (wish.units >= upper) {
      issues.push({
        severity: 'warning',
        field: at('units'),
        message: `Ein Lehrtag hat höchstens ${upper} Unterrichtsstunden – diese Grenze schränkt die Planung nicht ein.`,
      })
    }
  }
  return issues
}

function validateFullTime(entry: FullTimeEntry, config: PlanningConfig): Issue[] {
  const issues: Issue[] = []

  entry.wishes.forEach((wish, i) => issues.push(...validateWish(wish, i, config)))

  // Regel: genau ein Terminwunsch – mehr nur nach Abstimmung mit dem Präsidium.
  if (entry.wishes.length > 1 && !entry.exceptionAgreedWithPresidium) {
    issues.push({
      severity: 'error',
      field: 'exception',
      message:
        'Mehr als ein Terminwunsch ist nur nach vorheriger Abstimmung mit dem Präsidium möglich. Bitte bestätigen Sie die Abstimmung oder entfernen Sie den zusätzlichen Wunsch.',
    })
  }
  if (entry.wishes.length > MAX_WISHES_WITH_EXCEPTION) {
    issues.push({
      severity: 'error',
      field: 'exception',
      message: `Es können höchstens ${MAX_WISHES_WITH_EXCEPTION} Terminwünsche angegeben werden.`,
    })
  }

  // Regel: Stundenhöchstgrenze nicht mit Wochentag-/Uhrzeitwünschen kombinierbar.
  const hasMaxUnits = entry.wishes.some((w) => w.kind === 'MAX_UNITS_PER_DAY')
  if (hasMaxUnits && entry.wishes.length > 1) {
    issues.push({
      severity: 'warning',
      field: 'exception',
      message:
        'Laut Merkblatt kann eine Stundenhöchstgrenze nicht mit Wochentag- oder Uhrzeitwünschen kombiniert werden. Das gilt nur, wenn das Präsidium dem ausdrücklich zugestimmt hat.',
    })
  }

  // Widersprüche zwischen mehreren Wünschen am selben Tag.
  entry.wishes.forEach((wish, i) => {
    if (!('weekday' in wish)) return
    entry.wishes.slice(0, i).forEach((earlier) => {
      if (!('weekday' in earlier) || earlier.weekday !== wish.weekday) return
      issues.push({
        severity: 'warning',
        field: `wish.${i}.weekday`,
        message: `Ein früherer Wunsch betrifft ebenfalls ${WEEKDAY_ADVERB[wish.weekday]}. Bei Widersprüchen gilt der zuerst genannte Wunsch.`,
      })
    })
  })

  // Präsidiumssitzungen: zusätzlicher, verbindlicher Tag – zählt nicht als Wunsch.
  const { presidium } = entry
  if (presidium.isMember) {
    if (presidium.sessionWeekday === null) {
      issues.push({
        severity: 'error',
        field: 'presidium.sessionWeekday',
        message: 'Bitte wählen Sie den Wochentag der Präsidiumssitzungen.',
      })
    } else if (!config.teachingDays.includes(presidium.sessionWeekday)) {
      issues.push({
        severity: 'error',
        field: 'presidium.sessionWeekday',
        message: 'An diesem Wochentag findet keine Lehre statt.',
      })
    } else {
      entry.wishes.forEach((wish, i) => {
        if (!('weekday' in wish) || wish.weekday !== presidium.sessionWeekday) return
        const prefersSessionDay = wish.kind === 'DAY' && wish.preference === 'PREFER'
        issues.push({
          severity: prefersSessionDay ? 'error' : 'warning',
          field: `wish.${i}.weekday`,
          message: prefersSessionDay
            ? `${capitalize(WEEKDAY_ADVERB[wish.weekday])} stehen Sie wegen der Präsidiumssitzungen nicht für die Lehre zur Verfügung. Bitte wählen Sie einen anderen Tag.`
            : `${capitalize(WEEKDAY_ADVERB[wish.weekday])} sind Sie wegen der Präsidiumssitzungen ohnehin nicht eingeplant. Ihr Wunsch hätte so keine Wirkung. Wählen Sie besser einen anderen Tag.`,
        })
      })
    }
  }

  if (entry.wishConsideredLastBlock === null) {
    issues.push({
      severity: 'error',
      field: 'lastBlock',
      message: 'Bitte beantworten Sie, ob Ihr Wunsch im letzten Theorieblock berücksichtigt wurde.',
    })
  }

  return issues
}

function validateGrid(entry: GridEntry): Issue[] {
  // „Wie im letzten Jahr“ ohne vorliegende Daten: Raster bleibt leer, die Hauptanwendung ergänzt.
  if (entry.sameAsPreviousYear && !entry.sameAsPreviousYear.resolved) return []
  const anyAvailable = Object.values(entry.grid).some((day) =>
    day.some((mark) => mark !== 'UNAVAILABLE'),
  )
  return anyAvailable
    ? []
    : [
        {
          severity: 'error',
          field: 'grid',
          message: 'Bitte markieren Sie mindestens ein Zeitfenster, in dem Sie lehren können.',
        },
      ]
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.severity === 'error')
}

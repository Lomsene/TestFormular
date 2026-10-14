import type { AvailabilityExport } from '../domain/types'

/**
 * Frühere Einreichungen – Grundlage für „wie im letzten Jahr“.
 *
 * Übergangslösung: Abgesendete Einreichungen werden im Browser gemerkt. Sobald die
 * Hauptanwendung eine Schnittstelle anbietet, wird nur diese Datei gegen einen
 * REST-Aufruf ausgetauscht (z. B. GET /api/availabilities?email=…&block=…).
 */
const STORAGE_KEY = 'dhsh-verfuegbarkeit-historie-v1'

type HistoryStore = Record<string, AvailabilityExport>

const key = (email: string, blockId: string) => `${email.trim().toLowerCase()}|${blockId}`

function load(): HistoryStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as HistoryStore
  } catch {
    return {}
  }
}

export function findSubmission(email: string, blockId: string): AvailabilityExport | null {
  if (!email.trim()) return null
  return load()[key(email, blockId)] ?? null
}

export function rememberSubmission(data: AvailabilityExport): void {
  try {
    const store = load()
    store[key(data.lecturer.email, data.block.id)] = data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* Speicher nicht verfügbar – „wie im letzten Jahr“ greift dann auf die Hauptanwendung zurück */
  }
}

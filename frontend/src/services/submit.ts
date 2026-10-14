import type { AvailabilityExport } from '../domain/types'
import { exportFileName } from '../domain/export'

export type SubmitOutcome = { mode: 'SERVER' } | { mode: 'FILE'; fileName: string }

/**
 * Übermittelt die Angaben. Ist VITE_SUBMIT_URL gesetzt (z. B. REST-Endpunkt der
 * Hauptanwendung), wird per POST gesendet. Sonst wird eine JSON-Datei heruntergeladen,
 * die über das DMS an die Stundenplanung geht (Übergangslösung).
 */
export async function submitAvailability(data: AvailabilityExport): Promise<SubmitOutcome> {
  const url = import.meta.env.VITE_SUBMIT_URL as string | undefined
  if (url) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`Der Server hat die Angaben abgelehnt (HTTP ${response.status}).`)
    }
    return { mode: 'SERVER' }
  }
  const fileName = exportFileName(data)
  downloadJson(data, fileName)
  return { mode: 'FILE', fileName }
}

export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 0)
}

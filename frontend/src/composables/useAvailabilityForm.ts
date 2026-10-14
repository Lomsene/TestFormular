import { computed, reactive, ref, watch } from 'vue'
import { DEFAULT_CONFIG, THEORY_BLOCKS, type PlanningConfig } from '../domain/config'
import {
  draftMissing,
  draftToWish,
  newWishDraft,
  wishToDraft,
  type WishDraft,
} from '../domain/draft'
import { buildExport } from '../domain/export'
import type {
  AvailabilityEntry,
  AvailabilityExport,
  FullTimeEntry,
  GridEntry,
  LastBlockAnswer,
  LecturerData,
  LecturerKind,
  PreviousYearRef,
  ScheduleWish,
  TheoryBlock,
  Weekday,
  WeekGrid,
} from '../domain/types'
import { hasErrors, validateEntry, validateLecturer, type Issue } from '../domain/validation'
import { computeAvailability, emptyGrid } from '../domain/windows'
import { findSubmission } from '../services/history'

const STORAGE_KEY = 'dhsh-verfuegbarkeit-entwurf-v3'

export type PresidiumAnswer = 'NO' | 'YES' | 'SAME_AS_LAST_YEAR'
export type GridMode = 'OWN' | 'SAME_AS_LAST_YEAR'

interface GridState {
  mode: GridMode
  grid: WeekGrid
  note: string
}

export interface FormState {
  blockId: string
  /** null = noch nicht ausgewählt (Pflichtangabe im ersten Schritt). */
  kind: LecturerKind | null
  lecturer: LecturerData
  fullTime: {
    drafts: WishDraft[]
    exceptionAgreedWithPresidium: boolean
    wishConsideredLastBlock: LastBlockAnswer | null
    presidium: { answer: PresidiumAnswer; sessionWeekday: Weekday | null }
  }
  freelance: GridState
  partTime: GridState
}

// ---------------------------------------------------------------------------
// Schritte
// ---------------------------------------------------------------------------

export type StepId = 'person' | 'wish' | 'lastBlock' | 'presidium' | 'grid' | 'pending' | 'review'

export interface StepDef {
  id: StepId
  label: string
}

export const STEPS: Record<LecturerKind, StepDef[]> = {
  FULL_TIME: [
    { id: 'person', label: 'Ihre Angaben' },
    { id: 'wish', label: 'Terminwunsch' },
    { id: 'lastBlock', label: 'Letzter Block' },
    { id: 'presidium', label: 'Präsidium' },
    { id: 'review', label: 'Prüfen & absenden' },
  ],
  FREELANCE: [
    { id: 'person', label: 'Ihre Angaben' },
    { id: 'grid', label: 'Verfügbarkeit' },
    { id: 'review', label: 'Prüfen & absenden' },
  ],
  PART_TIME: [
    { id: 'person', label: 'Ihre Angaben' },
    { id: 'grid', label: 'Verfügbarkeit' },
    { id: 'review', label: 'Prüfen & absenden' },
  ],
}

/** Solange noch nicht gewählt ist, was man ist: nur grob, was kommt. */
export const STEPS_UNDECIDED: StepDef[] = [
  { id: 'person', label: 'Ihre Angaben' },
  { id: 'pending', label: 'Ihre Zeiten' },
  { id: 'review', label: 'Prüfen & absenden' },
]

/** Zu welchem Schritt gehört eine Meldung? */
export function stepOfField(field: string): StepId {
  if (['kind', 'lastName', 'firstName', 'email'].includes(field)) return 'person'
  if (field.startsWith('wish.') || field === 'exception') return 'wish'
  if (field === 'lastBlock') return 'lastBlock'
  if (field.startsWith('presidium')) return 'presidium'
  return 'grid'
}

// ---------------------------------------------------------------------------

/** Erster Theorieblock, dessen Eintragungsfrist noch läuft (sonst der erste). */
export function defaultBlock(blocks: TheoryBlock[], today: string): TheoryBlock {
  return blocks.find((b) => b.submissionDeadline >= today) ?? blocks[0]!
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function initialState(config: PlanningConfig): FormState {
  return {
    blockId: defaultBlock(THEORY_BLOCKS, todayIso()).id,
    kind: null,
    lecturer: { lastName: '', firstName: '', email: '' },
    fullTime: {
      drafts: [newWishDraft(config)],
      exceptionAgreedWithPresidium: false,
      wishConsideredLastBlock: null,
      presidium: { answer: 'NO', sessionWeekday: null },
    },
    freelance: { mode: 'OWN', grid: emptyGrid(config), note: '' },
    partTime: { mode: 'OWN', grid: emptyGrid(config), note: '' },
  }
}

function loadDraft(fallback: FormState): FormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw) as Partial<FormState>
    return {
      ...fallback,
      ...saved,
      lecturer: { ...fallback.lecturer, ...saved.lecturer },
      fullTime: { ...fallback.fullTime, ...saved.fullTime },
      freelance: { ...fallback.freelance, ...saved.freelance },
      partTime: { ...fallback.partTime, ...saved.partTime },
    }
  } catch {
    return fallback
  }
}

export function useAvailabilityForm(config: PlanningConfig = DEFAULT_CONFIG) {
  const state = reactive<FormState>(loadDraft(initialState(config)))
  const stepIndex = ref(0)
  /** Fehler eines Schritts erst zeigen, nachdem man dort „Weiter“ gedrückt hat. */
  const revealed = reactive(new Set<StepId>())

  watch(
    state,
    () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        /* Speicher nicht verfügbar – Formular funktioniert trotzdem */
      }
    },
    { deep: true },
  )

  const block = computed(
    () => THEORY_BLOCKS.find((b) => b.id === state.blockId) ?? THEORY_BLOCKS[0]!,
  )
  const deadlinePassed = computed(() => block.value.submissionDeadline < todayIso())

  // ----- „Wie im letzten Jahr“ ---------------------------------------------

  const previousBlockId = computed(() => block.value.previousYearBlockId ?? null)

  /** Einreichung derselben Person für den entsprechenden Block des Vorjahres (falls bekannt). */
  const previousSubmission = computed<AvailabilityExport | null>(() =>
    previousBlockId.value ? findSubmission(state.lecturer.email, previousBlockId.value) : null,
  )

  const previousFullTime = computed(() => {
    const a = previousSubmission.value?.answers
    return a?.kind === 'FULL_TIME' ? a : null
  })

  function previousGrid(kind: GridEntry['kind']): GridEntry | null {
    const a = previousSubmission.value?.answers
    return a && a.kind === kind ? a : null
  }

  function previousRef(resolved: boolean): PreviousYearRef | null {
    return previousBlockId.value ? { blockId: previousBlockId.value, resolved } : null
  }

  // ----- Antworten → fachlicher Eintrag ------------------------------------

  const wishesSameAsLastYear = computed(
    () => state.fullTime.drafts[0]?.kind === 'SAME_AS_LAST_YEAR',
  )

  /** Vollständige Wünsche samt Position des zugehörigen Entwurfs. */
  const completedWishes = computed(() => {
    const result: { wish: ScheduleWish; draftIndex: number }[] = []
    if (wishesSameAsLastYear.value) {
      previousFullTime.value?.wishes.forEach((wish) => result.push({ wish, draftIndex: 0 }))
      return result
    }
    state.fullTime.drafts.forEach((d, draftIndex) => {
      const wish = draftToWish(d)
      if (wish) result.push({ wish, draftIndex })
    })
    return result
  })

  const fullTimeEntry = computed<FullTimeEntry>(() => {
    const ft = state.fullTime
    const prev = previousFullTime.value
    const presidiumSame = ft.presidium.answer === 'SAME_AS_LAST_YEAR'
    const presidium = presidiumSame
      ? (prev?.presidium ?? { isMember: false, sessionWeekday: null })
      : {
          isMember: ft.presidium.answer === 'YES',
          sessionWeekday: ft.presidium.answer === 'YES' ? ft.presidium.sessionWeekday : null,
        }
    return {
      kind: 'FULL_TIME',
      wishes: completedWishes.value.map((w) => w.wish),
      exceptionAgreedWithPresidium: wishesSameAsLastYear.value
        ? (prev?.exceptionAgreedWithPresidium ?? false)
        : ft.exceptionAgreedWithPresidium,
      wishConsideredLastBlock: ft.wishConsideredLastBlock,
      presidium,
      sameAsPreviousYear: {
        wishes: wishesSameAsLastYear.value ? previousRef(prev !== null) : null,
        presidium: presidiumSame ? previousRef(prev !== null) : null,
      },
    }
  })

  function gridEntry(kind: GridEntry['kind']): GridEntry {
    const s = kind === 'FREELANCE' ? state.freelance : state.partTime
    if (s.mode === 'SAME_AS_LAST_YEAR') {
      const prev = previousGrid(kind)
      return {
        kind,
        grid: prev?.grid ?? emptyGrid(config),
        note: s.note.trim() || prev?.note || '',
        sameAsPreviousYear: previousRef(prev !== null),
      }
    }
    return { kind, grid: s.grid, note: s.note.trim(), sameAsPreviousYear: null }
  }

  const entry = computed<AvailabilityEntry>(() =>
    state.kind === 'FREELANCE' || state.kind === 'PART_TIME'
      ? gridEntry(state.kind)
      : fullTimeEntry.value,
  )

  // ----- Prüfung -------------------------------------------------------------

  const issues = computed<Issue[]>(() => {
    const list: Issue[] = []
    if (state.kind === null) {
      list.push({
        severity: 'error',
        field: 'kind',
        message: 'Bitte wählen Sie aus, was auf Sie zutrifft.',
      })
    }
    list.push(...validateLecturer(state.lecturer))
    if (state.kind === null) return list
    if (state.kind === 'FULL_TIME') {
      if (!wishesSameAsLastYear.value) {
        state.fullTime.drafts.forEach((d, i) => {
          const missing = draftMissing(d)
          if (missing) {
            list.push({
              severity: 'error',
              field: d.kind === null ? `wish.${i}.kind` : `wish.${i}.weekday`,
              message: missing,
            })
          }
        })
      }
      // Meldungen beziehen sich auf vollständige Wünsche – Index auf Entwurf zurückrechnen.
      const toDraft = completedWishes.value.map((w) => w.draftIndex)
      for (const issue of validateEntry(entry.value, config)) {
        list.push({
          ...issue,
          field: issue.field.replace(/^wish\.(\d+)\./, (_, k) => `wish.${toDraft[Number(k)]}.`),
        })
      }
    } else {
      list.push(...validateEntry(entry.value, config))
    }
    return list
  })

  const result = computed(() => computeAvailability(entry.value, config))

  // ----- Schritte -------------------------------------------------------------

  const steps = computed(() => (state.kind ? STEPS[state.kind] : STEPS_UNDECIDED))
  const step = computed(() => steps.value[Math.min(stepIndex.value, steps.value.length - 1)]!)

  function stepErrors(id: StepId): Issue[] {
    return issues.value.filter((i) => i.severity === 'error' && stepOfField(i.field) === id)
  }

  function issuesFor(field: string): Issue[] {
    return issues.value.filter(
      (i) => i.field === field && (i.severity === 'warning' || revealed.has(stepOfField(i.field))),
    )
  }

  function stepComplete(id: StepId): boolean {
    return id === 'review' ? !hasErrors(issues.value) : stepErrors(id).length === 0
  }

  /** Weiter, wenn der aktuelle Schritt in Ordnung ist. Gibt false zurück, wenn nicht. */
  function next(): boolean {
    revealed.add(step.value.id)
    if (stepErrors(step.value.id).length) return false
    stepIndex.value = Math.min(stepIndex.value + 1, steps.value.length - 1)
    return true
  }

  function back() {
    stepIndex.value = Math.max(0, stepIndex.value - 1)
  }

  /** Direkt zu einem Schritt springen – nach vorn nur, wenn alle Schritte davor stimmen. */
  function goTo(index: number): boolean {
    for (let i = 0; i < index; i++) {
      const id = steps.value[i]!.id
      if (!stepComplete(id)) {
        revealed.add(id)
        stepIndex.value = i
        return false
      }
    }
    stepIndex.value = index
    return true
  }

  // ----- Wünsche bearbeiten -------------------------------------------------

  function addExtraWish() {
    state.fullTime.drafts.push(newWishDraft(config))
  }

  function removeWish(index: number) {
    state.fullTime.drafts.splice(index, 1)
    if (state.fullTime.drafts.length <= 1) state.fullTime.exceptionAgreedWithPresidium = false
  }

  /** Vorjahreswünsche als Ausgangspunkt übernehmen und bearbeitbar machen. */
  function adoptPreviousWishes() {
    const prev = previousFullTime.value
    if (!prev) return
    state.fullTime.drafts = prev.wishes.length
      ? prev.wishes.map((w) => wishToDraft(w, config))
      : [newWishDraft(config, 'NONE')]
    state.fullTime.exceptionAgreedWithPresidium = prev.exceptionAgreedWithPresidium
  }

  function adoptPreviousPresidium() {
    const prev = previousFullTime.value
    if (!prev) return
    state.fullTime.presidium.answer = prev.presidium.isMember ? 'YES' : 'NO'
    state.fullTime.presidium.sessionWeekday = prev.presidium.sessionWeekday
  }

  function adoptPreviousGrid(kind: GridEntry['kind']) {
    const prev = previousGrid(kind)
    const s = kind === 'FREELANCE' ? state.freelance : state.partTime
    if (!prev) return
    s.grid = JSON.parse(JSON.stringify(prev.grid)) as WeekGrid
    s.note = prev.note
    s.mode = 'OWN'
  }

  // ----- Absenden -------------------------------------------------------------

  /** Übergabedokument für die Prüfansicht – auch wenn noch nicht alles stimmt. */
  const preview = computed(() => buildExport(state.lecturer, block.value, entry.value, config))

  function buildSubmission(): AvailabilityExport | null {
    for (const s of steps.value) revealed.add(s.id)
    const firstBad = steps.value.findIndex((s) => s.id !== 'review' && !stepComplete(s.id))
    if (firstBad >= 0) {
      stepIndex.value = firstBad
      return null
    }
    return buildExport(state.lecturer, block.value, entry.value, config)
  }

  function reset() {
    Object.assign(state, initialState(config))
    stepIndex.value = 0
    revealed.clear()
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* Speicher nicht verfügbar – nichts zu tun */
    }
  }

  return {
    config,
    state,
    block,
    deadlinePassed,
    previousBlockId,
    previousSubmission,
    previousFullTime,
    previousGrid,
    entry,
    issues,
    issuesFor,
    result,
    preview,
    steps,
    step,
    stepIndex,
    stepComplete,
    next,
    back,
    goTo,
    addExtraWish,
    removeWish,
    adoptPreviousWishes,
    adoptPreviousPresidium,
    adoptPreviousGrid,
    buildSubmission,
    reset,
  }
}

export type AvailabilityForm = ReturnType<typeof useAvailabilityForm>

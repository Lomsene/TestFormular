import { computed, reactive, ref, watch } from 'vue'
import { DEFAULT_CONFIG, THEORY_BLOCKS, type PlanningConfig } from '../domain/config'
import { draftMissing, draftToWish, newWishDraft, type WishDraft } from '../domain/draft'
import { buildExport } from '../domain/export'
import type {
  AvailabilityEntry,
  LastBlockAnswer,
  LecturerData,
  LecturerKind,
  ScheduleWish,
  TheoryBlock,
  Weekday,
  WeekGrid,
} from '../domain/types'
import { hasErrors, validateEntry, validateLecturer, type Issue } from '../domain/validation'
import { computeAvailability, emptyGrid } from '../domain/windows'

const STORAGE_KEY = 'dhsh-verfuegbarkeit-entwurf-v1'

export interface FormState {
  blockId: string
  kind: LecturerKind
  lecturer: LecturerData
  fullTime: {
    drafts: WishDraft[]
    exceptionAgreedWithPresidium: boolean
    wishConsideredLastBlock: LastBlockAnswer | null
    presidium: { isMember: boolean; sessionWeekday: Weekday | null }
  }
  freelance: { grid: WeekGrid; note: string }
  partTime: { grid: WeekGrid; note: string }
}

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
    kind: 'FULL_TIME',
    lecturer: { lastName: '', firstName: '', email: '' },
    fullTime: {
      drafts: [newWishDraft(config)],
      exceptionAgreedWithPresidium: false,
      wishConsideredLastBlock: null,
      presidium: { isMember: false, sessionWeekday: null },
    },
    freelance: { grid: emptyGrid(config), note: '' },
    partTime: { grid: emptyGrid(config), note: '' },
  }
}

function loadDraft(fallback: FormState): FormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw) as Partial<FormState>
    // Flach mit den Standardwerten zusammenführen, falls neue Felder dazugekommen sind.
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
  /** Fehler erst nach dem ersten Absendeversuch anzeigen – nicht schon beim Tippen. */
  const showErrors = ref(false)
  const draftSaved = ref(false)

  watch(
    state,
    () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        draftSaved.value = true
      } catch {
        draftSaved.value = false
      }
    },
    { deep: true },
  )

  const block = computed(
    () => THEORY_BLOCKS.find((b) => b.id === state.blockId) ?? THEORY_BLOCKS[0]!,
  )
  const deadlinePassed = computed(() => block.value.submissionDeadline < todayIso())

  /** Vollständige Wünsche samt Position des zugehörigen Entwurfs. */
  const completedWishes = computed(() => {
    const result: { wish: ScheduleWish; draftIndex: number }[] = []
    state.fullTime.drafts.forEach((d, draftIndex) => {
      const wish = draftToWish(d)
      if (wish) result.push({ wish, draftIndex })
    })
    return result
  })

  const entry = computed<AvailabilityEntry>(() => {
    switch (state.kind) {
      case 'FULL_TIME':
        return {
          kind: 'FULL_TIME',
          wishes: completedWishes.value.map((w) => w.wish),
          exceptionAgreedWithPresidium: state.fullTime.exceptionAgreedWithPresidium,
          wishConsideredLastBlock: state.fullTime.wishConsideredLastBlock,
          presidium: {
            isMember: state.fullTime.presidium.isMember,
            sessionWeekday: state.fullTime.presidium.isMember
              ? state.fullTime.presidium.sessionWeekday
              : null,
          },
        }
      case 'FREELANCE':
        return { kind: 'FREELANCE', grid: state.freelance.grid, note: state.freelance.note.trim() }
      case 'PART_TIME':
        return { kind: 'PART_TIME', grid: state.partTime.grid, note: state.partTime.note.trim() }
    }
  })

  const issues = computed<Issue[]>(() => {
    const list: Issue[] = [...validateLecturer(state.lecturer)]
    if (state.kind === 'FULL_TIME') {
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

  function issuesFor(field: string): Issue[] {
    return issues.value.filter(
      (i) => i.field === field && (i.severity === 'warning' || showErrors.value),
    )
  }

  function addExtraWish() {
    state.fullTime.drafts.push(newWishDraft(config))
  }

  function removeWish(index: number) {
    state.fullTime.drafts.splice(index, 1)
    if (state.fullTime.drafts.length <= 1) state.fullTime.exceptionAgreedWithPresidium = false
  }

  function buildSubmission() {
    showErrors.value = true
    if (hasErrors(issues.value)) return null
    return buildExport(state.lecturer, block.value, entry.value, config)
  }

  function reset() {
    Object.assign(state, initialState(config))
    showErrors.value = false
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
    entry,
    issues,
    issuesFor,
    showErrors,
    draftSaved,
    result,
    addExtraWish,
    removeWish,
    buildSubmission,
    reset,
  }
}

export type AvailabilityForm = ReturnType<typeof useAvailabilityForm>

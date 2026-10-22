<script setup lang="ts">
import { computed } from 'vue'
import type { PlanningConfig } from '../domain/config'
import { EVERY_DAY, draftToWish, type WishDraft, type WishWhat } from '../domain/draft'
import { WEEKDAY_LABEL, WEEKDAY_SHORT, describeWish, formatTime } from '../domain/format'
import type { Weekday } from '../domain/types'
import { maxUnitsUpperBound, type Issue } from '../domain/validation'
import ChoiceGroup, { type Choice } from './ChoiceGroup.vue'
import FieldMessages from './FieldMessages.vue'

/**
 * Ein Terminwunsch als Satzbaukasten: „Ich möchte [Tag] [was].“
 *
 * Für den ersten Wunsch steht jede Frage auf einem eigenen Schritt (`part`), groß und mit
 * Erklärung. Weitere Wünsche (Ausnahmefall) zeigen Tag und „was“ kompakt untereinander.
 */
export type WishPart = 'answer' | 'day' | 'what' | 'compact'

const props = defineProps<{
  draft: WishDraft
  index: number
  config: PlanningConfig
  issuesFor: (field: string) => Issue[]
  part: WishPart
  /** Bezeichnung des Vorjahresblocks; null = es gibt keinen. */
  previousLabel?: string | null
}>()

const draft = computed(() => props.draft)
const id = (name: string) => `wish-${props.index}-${name}`
const issues = (name: string) => props.issuesFor(`wish.${props.index}.${name}`)
const hasError = (...names: string[]) =>
  names.some((n) => issues(n).some((i) => i.severity === 'error'))

/** Eigener Schritt: Frage steht schon als Überschrift, Knöpfe als große Karten. */
const standalone = computed(() => props.part !== 'compact')
const shows = (p: 'day' | 'what') => props.part === p || props.part === 'compact'

const answerOptions = computed<Choice<NonNullable<WishDraft['answer']>>[]>(() => [
  {
    value: 'WISH',
    label: 'Ja, ich habe einen Wunsch',
    description: 'z. B. „freitags ab 13 Uhr keine Lehre“',
  },
  {
    value: 'NONE',
    label: 'Nein, kein Wunsch',
    description: 'Ich kann an allen Tagen eingeplant werden.',
  },
  {
    value: 'SAME_AS_LAST_YEAR',
    label: 'Wie im letzten Jahr',
    description: props.previousLabel
      ? `Gleicher Wunsch wie im ${props.previousLabel}.`
      : 'Für diesen Block nicht möglich.',
    disabled: !props.previousLabel,
  },
])

const dayOptions = computed<Choice<Weekday | typeof EVERY_DAY>[]>(() => [
  ...props.config.teachingDays.map((d) => ({
    value: d,
    label: standalone.value ? WEEKDAY_LABEL[d] : WEEKDAY_SHORT[d],
  })),
  standalone.value
    ? {
        value: EVERY_DAY,
        label: 'Jeden Tag',
        description: 'nur für eine Höchstzahl an Stunden pro Tag',
      }
    : { value: EVERY_DAY, label: 'Jeden Tag' },
])

const WHAT_OPTIONS: Choice<WishWhat>[] = [
  {
    value: 'AVOID',
    label: 'Keine Lehre',
    description: 'an diesem Tag gar nicht',
    tone: 'negative',
  },
  {
    value: 'PREFER',
    label: 'Gern Lehre',
    description: 'an diesem Tag besonders gern',
    tone: 'positive',
  },
  { value: 'FROM', label: 'Erst ab … Uhr', description: 'z. B. erst ab 10 Uhr' },
  { value: 'UNTIL', label: 'Nur bis … Uhr', description: 'z. B. nur bis 13 Uhr' },
  { value: 'RANGE', label: 'Nur von … bis … Uhr', description: 'z. B. nur von 10 bis 14 Uhr' },
  { value: 'ONLINE', label: 'Nur online', description: 'nur Online-Lehrveranstaltungen' },
]

/** Kompakt: kurze Knöpfe ohne Erklärung. */
const whatOptions = computed(() =>
  standalone.value
    ? WHAT_OPTIONS
    : WHAT_OPTIONS.map(({ description: _, ...o }) => ({ ...o, label: o.label.toLowerCase() })),
)

const needsTime = computed(
  () =>
    draft.value.day !== EVERY_DAY && (draft.value.what === 'FROM' || draft.value.what === 'UNTIL'),
)

const timeOptions = computed(() => {
  const list: number[] = []
  const { dayStart, dayEnd, slotMinutes } = props.config
  for (let t = dayStart + slotMinutes; t < dayEnd; t += slotMinutes) list.push(t)
  return list
})

/** Für „von … bis“: Beginn ab Tagesbeginn, Ende bis Tagesende. */
const rangeStartOptions = computed(() => [props.config.dayStart, ...timeOptions.value])
const rangeEndOptions = computed(() => [...timeOptions.value, props.config.dayEnd])

const upper = computed(() => maxUnitsUpperBound(props.config))

function setUnits(value: number) {
  const n = Math.round(value)
  draft.value.units = Number.isFinite(n) ? Math.max(1, Math.min(upper.value, n)) : draft.value.units
}

const preview = computed(() => {
  if (!shows('what')) return null
  const wish = draftToWish(draft.value)
  return wish ? describeWish(wish) : null
})
</script>

<template>
  <div class="wish" :class="{ compact: !standalone }">
    <!-- Haben Sie einen Wunsch? -->
    <template v-if="part === 'answer'">
      <ChoiceGroup
        v-model="draft.answer"
        :name="id('answer')"
        legend="Haben Sie einen Terminwunsch?"
        hide-legend
        variant="cards"
        :options="answerOptions"
        :invalid="hasError('answer')"
      />
      <FieldMessages :issues="issues('answer')" />
    </template>

    <!-- An welchem Tag? -->
    <div v-if="shows('day')" class="row">
      <span v-if="!standalone" class="lead-in" aria-hidden="true">1</span>
      <div class="row-body">
        <ChoiceGroup
          v-model="draft.day"
          :name="id('day')"
          legend="An welchem Tag?"
          :hide-legend="standalone"
          :variant="standalone ? 'cards' : 'segmented'"
          :options="dayOptions"
          :invalid="hasError('day', 'weekday')"
        />
        <FieldMessages :issues="[...issues('day'), ...issues('weekday')]" />
      </div>
    </div>

    <!-- Was genau? -->
    <div v-if="shows('what') && draft.day" class="row">
      <span v-if="!standalone" class="lead-in" aria-hidden="true">2</span>

      <div v-if="draft.day !== EVERY_DAY" class="row-body">
        <ChoiceGroup
          v-model="draft.what"
          :name="id('what')"
          legend="Was wünschen Sie sich an diesem Tag?"
          :hide-legend="standalone"
          :variant="standalone ? 'cards' : 'segmented'"
          :options="whatOptions"
          :invalid="hasError('what')"
        />
        <FieldMessages :issues="issues('what')" />

        <div v-if="needsTime" class="inline-field">
          <label :for="id('time')">
            {{ draft.what === 'FROM' ? 'Lehre frühestens ab' : 'Lehre höchstens bis' }}
          </label>
          <select :id="id('time')" v-model.number="draft.time" class="select">
            <option v-for="t in timeOptions" :key="t" :value="t">{{ formatTime(t) }} Uhr</option>
          </select>
        </div>
        <div v-if="draft.what === 'RANGE'" class="inline-field">
          <label :for="id('time')">Lehre nur von</label>
          <select :id="id('time')" v-model.number="draft.time" class="select">
            <option v-for="t in rangeStartOptions" :key="t" :value="t">
              {{ formatTime(t) }} Uhr
            </option>
          </select>
          <label :for="id('time-end')">bis</label>
          <select :id="id('time-end')" v-model.number="draft.timeEnd" class="select">
            <option v-for="t in rangeEndOptions" :key="t" :value="t">
              {{ formatTime(t) }} Uhr
            </option>
          </select>
        </div>
        <FieldMessages :issues="issues('time')" />
      </div>

      <div v-else class="row-body">
        <span :id="id('units-label')" class="label">Höchstens so viele Unterrichtsstunden</span>
        <div class="stepper" role="group" :aria-labelledby="id('units-label')">
          <button
            type="button"
            class="btn"
            aria-label="Eine Stunde weniger"
            :disabled="draft.units <= config.minMaxUnitsPerDay"
            @click="setUnits(draft.units - 1)"
          >
            −
          </button>
          <input
            :id="id('units')"
            class="input"
            type="number"
            inputmode="numeric"
            :min="config.minMaxUnitsPerDay"
            :max="upper"
            :value="draft.units"
            :aria-invalid="hasError('units') || undefined"
            @change="setUnits(Number(($event.target as HTMLInputElement).value))"
          />
          <button
            type="button"
            class="btn"
            aria-label="Eine Stunde mehr"
            :disabled="draft.units >= upper"
            @click="setUnits(draft.units + 1)"
          >
            +
          </button>
          <span class="unit">pro Tag (à {{ config.unitMinutes }} Min.)</span>
        </div>
        <p class="hint">
          Mindestens {{ config.minMaxUnitsPerDay }}. Gilt für alle Tage und lässt sich nicht mit
          einem Wochentag kombinieren.
        </p>
        <FieldMessages :issues="issues('units')" />
      </div>
    </div>

    <p v-if="preview" class="preview" aria-live="polite">
      <span class="preview-label">Ihr Wunsch lautet</span>
      „{{ preview }}“
    </p>
  </div>
</template>

<style scoped>
.wish {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wish.compact {
  gap: 16px;
}

.row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.lead-in {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 700;
}

.row-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.inline-field {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-alt);
  border: 1px solid var(--border);
}

.inline-field label {
  font-weight: 600;
  font-size: 0.92rem;
}

.inline-field .select {
  width: auto;
  min-width: 130px;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stepper .btn {
  width: 40px;
  padding: 0;
  font-size: 1.2rem;
}

.stepper .btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stepper .input {
  width: 72px;
  text-align: center;
  font-weight: 600;
}

.unit {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.preview {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  border-left: 4px solid var(--accent);
  font-size: 1rem;
}

.preview-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent);
}
</style>

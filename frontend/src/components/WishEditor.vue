<script setup lang="ts">
import { computed } from 'vue'
import type { PlanningConfig } from '../domain/config'
import { draftToWish, type WishDraft } from '../domain/draft'
import { WEEKDAY_LABEL, WEEKDAY_SHORT, describeWish, formatClock, formatTime } from '../domain/format'
import type { Weekday } from '../domain/types'
import { maxUnitsUpperBound, type Issue } from '../domain/validation'
import ChoiceGroup, { type Choice } from './ChoiceGroup.vue'
import FieldMessages from './FieldMessages.vue'

const props = defineProps<{
  draft: WishDraft
  index: number
  config: PlanningConfig
  issuesFor: (field: string) => Issue[]
  /** Nur beim ersten Wunsch darf „kein Wunsch“ gewählt werden. */
  allowNone: boolean
}>()

const draft = computed(() => props.draft)
const id = (name: string) => `wish-${props.index}-${name}`
const issues = (name: string) => props.issuesFor(`wish.${props.index}.${name}`)

const kindOptions = computed<Choice<NonNullable<WishDraft['kind']>>[]>(() => [
  ...(props.allowNone
    ? [
        {
          value: 'NONE' as const,
          label: 'Kein Wunsch',
          description: 'Ich kann an allen Tagen frei eingeplant werden.',
        },
      ]
    : []),
  {
    value: 'DAY',
    label: 'Ein ganzer Wochentag',
    description: 'z. B. „montags keine Lehre“ oder „gern freitags“',
  },
  {
    value: 'DAY_TIME',
    label: 'Ein Wochentag ab/bis Uhrzeit',
    description: 'z. B. „freitags ab 13 Uhr keine Lehre“',
  },
  {
    value: 'ONLINE_ONLY',
    label: 'Ein Wochentag nur online',
    description: 'z. B. „montags nur Online-Lehre“',
  },
  {
    value: 'MAX_UNITS_PER_DAY',
    label: 'Höchstens … Stunden pro Tag',
    description: `z. B. „maximal ${props.config.minMaxUnitsPerDay} Unterrichtsstunden täglich“`,
  },
])

const weekdayOptions = computed<Choice<Weekday>[]>(() =>
  props.config.teachingDays.map((d) => ({ value: d, label: WEEKDAY_SHORT[d] })),
)

const timeOptions = computed(() => {
  const list: number[] = []
  const { dayStart, dayEnd, slotMinutes } = props.config
  for (let t = dayStart + slotMinutes; t < dayEnd; t += slotMinutes) list.push(t)
  return list
})

const upper = computed(() => maxUnitsUpperBound(props.config))

function setUnits(value: number) {
  const n = Math.round(value)
  draft.value.units = Number.isFinite(n) ? Math.max(1, Math.min(upper.value, n)) : draft.value.units
}

const preview = computed(() => {
  const wish = draftToWish(draft.value)
  return wish ? describeWish(wish) : null
})

/** Anteil des Tages vor der gewählten Uhrzeit – für die kleine Tagesgrafik. */
const splitPercent = computed(() => {
  const { dayStart, dayEnd } = props.config
  return ((draft.value.time - dayStart) / (dayEnd - dayStart)) * 100
})
</script>

<template>
  <div class="wish">
    <ChoiceGroup
      v-model="draft.kind"
      :name="id('kind')"
      :legend="index === 0 ? 'Welche Art von Wunsch haben Sie?' : 'Welche Art von weiterem Wunsch?'"
      variant="cards"
      :options="kindOptions"
      :invalid="issues('kind').some((i) => i.severity === 'error')"
    />
    <FieldMessages :issues="issues('kind')" />

    <div v-if="draft.kind && draft.kind !== 'NONE'" class="details">
      <!-- Ganzer Tag: gern oder nicht -->
      <ChoiceGroup
        v-if="draft.kind === 'DAY'"
        v-model="draft.preference"
        :name="id('preference')"
        legend="Was wünschen Sie sich für diesen Tag?"
        :options="[
          { value: 'AVOID', label: 'Keine Lehre an diesem Tag', tone: 'negative' },
          { value: 'PREFER', label: 'Gern Lehre an diesem Tag', tone: 'positive' },
        ]"
      />

      <div v-if="draft.kind !== 'MAX_UNITS_PER_DAY'">
        <ChoiceGroup
          v-model="draft.weekday"
          :name="id('weekday')"
          legend="An welchem Wochentag?"
          :options="weekdayOptions"
          :invalid="issues('weekday').some((i) => i.severity === 'error')"
        />
        <p class="hint">Ein Terminwunsch kann sich immer nur auf einen Wochentag beziehen.</p>
        <FieldMessages :issues="issues('weekday')" />
      </div>

      <!-- Tag mit Uhrzeit -->
      <template v-if="draft.kind === 'DAY_TIME'">
        <ChoiceGroup
          v-model="draft.blocked"
          :name="id('blocked')"
          legend="Welcher Teil des Tages soll frei bleiben?"
          :options="[
            { value: 'BEFORE', label: 'Der Vormittag', description: 'Ich lehre erst ab einer Uhrzeit.' },
            { value: 'AFTER', label: 'Der Nachmittag', description: 'Ab einer Uhrzeit lehre ich nicht.' },
          ]"
          variant="cards"
        />
        <div class="field time-field">
          <label :for="id('time')">
            {{ draft.blocked === 'BEFORE' ? 'Lehre frühestens ab' : 'Keine Lehre mehr ab' }}
          </label>
          <select :id="id('time')" v-model.number="draft.time" class="select">
            <option v-for="t in timeOptions" :key="t" :value="t">{{ formatTime(t) }} Uhr</option>
          </select>
          <FieldMessages :issues="issues('time')" />
        </div>
        <div class="daybar" aria-hidden="true">
          <div
            class="part"
            :class="draft.blocked === 'BEFORE' ? 'off' : 'on'"
            :style="{ width: `${splitPercent}%` }"
          >
            <span>{{ formatTime(config.dayStart) }}</span>
          </div>
          <div class="part" :class="draft.blocked === 'BEFORE' ? 'on' : 'off'">
            <span>{{ formatTime(draft.time) }}</span>
            <span>{{ formatTime(config.dayEnd) }}</span>
          </div>
        </div>
        <p class="hint">
          {{ draft.weekday ? WEEKDAY_LABEL[draft.weekday] : 'Am gewählten Tag' }}:
          <span class="dot on" /> verfügbar · <span class="dot off" /> möglichst keine Lehre
          ({{ draft.blocked === 'BEFORE' ? `bis ${formatClock(draft.time)}` : `ab ${formatClock(draft.time)}` }})
        </p>
      </template>

      <!-- Stundenhöchstgrenze -->
      <div v-if="draft.kind === 'MAX_UNITS_PER_DAY'" class="field">
        <label :for="id('units')">Höchstens so viele Unterrichtsstunden pro Tag</label>
        <div class="stepper">
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
            :aria-invalid="issues('units').some((i) => i.severity === 'error') || undefined"
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
          <span class="unit">Unterrichtsstunden à {{ config.unitMinutes }} Minuten</span>
        </div>
        <p class="hint">
          Mindestens {{ config.minMaxUnitsPerDay }}. Gilt für alle Tage und kann nicht mit einem
          Wochentag oder einer Uhrzeit kombiniert werden.
        </p>
        <FieldMessages :issues="issues('units')" />
      </div>
    </div>

    <p v-if="preview" class="preview">
      <span class="preview-label">Ihr Wunsch lautet:</span>
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

.details {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 16px;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--surface-alt);
  border: 1px solid var(--border);
}

.time-field {
  max-width: 220px;
}

.daybar {
  display: flex;
  height: 28px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.part {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 6px;
  flex: 1;
  transition: width 0.15s;
}

.part:first-child {
  flex: none;
}

.on {
  background: var(--st-available-bg);
  color: #24602a;
}

.off {
  background: repeating-linear-gradient(
    -45deg,
    var(--st-unavailable-bg),
    var(--st-unavailable-bg) 6px,
    #f6c4c4 6px,
    #f6c4c4 12px
  );
  color: #8e1c1c;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  vertical-align: -1px;
  border: 1px solid var(--border-strong);
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
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
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

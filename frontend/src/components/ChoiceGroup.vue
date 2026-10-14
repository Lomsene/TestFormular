<script setup lang="ts" generic="T extends string | boolean">
/**
 * Auswahl als Schaltflächen – technisch echte Radiobuttons, damit Tastatur
 * (Pfeiltasten) und Screenreader ohne Zusatzaufwand funktionieren.
 */
export interface Choice<V> {
  value: V
  label: string
  description?: string
  disabled?: boolean
  tone?: 'positive' | 'negative' | 'neutral'
}

defineProps<{
  name: string
  legend: string
  options: Choice<T>[]
  variant?: 'segmented' | 'cards'
  invalid?: boolean
  hideLegend?: boolean
}>()

const model = defineModel<T | null>({ required: true })
</script>

<template>
  <fieldset
    class="choices"
    :class="[`choices-${variant ?? 'segmented'}`, { invalid }]"
    :aria-invalid="invalid || undefined"
  >
    <legend :class="hideLegend ? 'visually-hidden' : 'label'">{{ legend }}</legend>
    <div class="options">
      <label
        v-for="opt in options"
        :key="String(opt.value)"
        class="option"
        :class="[{ checked: model === opt.value, disabled: opt.disabled }, opt.tone && `tone-${opt.tone}`]"
      >
        <input
          type="radio"
          class="visually-hidden"
          :name="name"
          :value="opt.value"
          :checked="model === opt.value"
          :disabled="opt.disabled"
          @change="model = opt.value"
        />
        <span class="option-label">{{ opt.label }}</span>
        <span v-if="opt.description" class="option-desc">{{ opt.description }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.choices {
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.choices > legend.label {
  margin-bottom: 6px;
  padding: 0;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option {
  position: relative;
  cursor: pointer;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  transition:
    background 0.12s,
    border-color 0.12s;
}

.option:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.option:has(input:focus-visible) {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.option.checked {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.option.checked.tone-positive {
  background: var(--st-preferred);
  border-color: var(--st-preferred);
}

.option.checked.tone-negative {
  background: var(--st-unavailable);
  border-color: var(--st-unavailable);
}

.option.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.invalid .option:not(.checked) {
  border-color: var(--error);
}

/* Segmentiert: kompakte Knöpfe, z. B. Wochentage */
.choices-segmented .option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  min-width: 52px;
  padding: 6px 14px;
  font-weight: 600;
}

/* Karten: größere Flächen mit Erklärung, z. B. Art des Wunsches */
.choices-cards .options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.choices-cards .option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border-radius: var(--radius);
}

.choices-cards .option-label {
  font-weight: 600;
}

.option-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.option.checked .option-desc {
  color: rgb(255 255 255 / 88%);
}
</style>

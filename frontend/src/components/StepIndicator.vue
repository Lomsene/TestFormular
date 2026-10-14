<script setup lang="ts">
import type { StepDef } from '../composables/useAvailabilityForm'

defineProps<{
  steps: StepDef[]
  current: number
  isComplete: (id: StepDef['id']) => boolean
}>()
defineEmits<{ go: [index: number] }>()
</script>

<template>
  <nav class="stepper" aria-label="Fortschritt">
    <ol>
      <li
        v-for="(s, i) in steps"
        :key="s.id"
        :class="{ current: i === current, done: i < current && isComplete(s.id) }"
      >
        <button
          type="button"
          :aria-current="i === current ? 'step' : undefined"
          @click="$emit('go', i)"
        >
          <span class="num" aria-hidden="true">{{
            i < current && isComplete(s.id) ? '✓' : i + 1
          }}</span>
          <span class="label">{{ s.label }}</span>
        </button>
      </li>
    </ol>
    <p class="mobile-label" aria-hidden="true">
      Schritt {{ current + 1 }} von {{ steps.length }}: <strong>{{ steps[current]?.label }}</strong>
    </p>
  </nav>
</template>

<style scoped>
.stepper {
  margin-bottom: 20px;
}

ol {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: step;
}

li {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
}

/* Verbindungslinie zwischen den Punkten */
li + li::before {
  content: '';
  position: absolute;
  top: 15px;
  right: 50%;
  width: 100%;
  height: 2px;
  background: var(--border-strong);
  z-index: 0;
}

li.done + li::before,
li.done + li.current::before {
  background: var(--st-preferred);
}

button {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 0 4px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.num {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
  background: var(--bg);
  font-weight: 700;
  transition:
    background 0.15s,
    border-color 0.15s;
}

li.done .num {
  background: var(--st-preferred);
  border-color: var(--st-preferred);
  color: #fff;
}

li.current .num {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  box-shadow: 0 0 0 4px var(--accent-soft);
}

li.current button {
  color: var(--text);
  font-weight: 600;
}

button:hover .num {
  border-color: var(--accent);
}

.mobile-label {
  display: none;
  margin: 10px 0 0;
  text-align: center;
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .label {
    display: none;
  }

  .mobile-label {
    display: block;
  }
}
</style>

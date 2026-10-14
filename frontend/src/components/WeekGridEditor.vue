<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { PlanningConfig } from '../domain/config'
import { WEEKDAY_LABEL, WEEKDAY_SHORT, formatTime } from '../domain/format'
import type { GridMark, Weekday, WeekGrid } from '../domain/types'
import { slotCount } from '../domain/windows'

/**
 * Wochenraster zum „Ausmalen“ der Verfügbarkeit: Pinsel wählen, dann mit gedrückter
 * Maustaste (oder Finger) über die Zeiten ziehen. Tastatur: Tab zu einer Zelle,
 * Leertaste/Enter setzt den gewählten Pinsel, Pfeiltasten bewegen den Fokus.
 */
const props = defineProps<{ grid: WeekGrid; config: PlanningConfig }>()

const brush = ref<GridMark>('AVAILABLE')
const painting = ref(false)

const slots = computed(() =>
  Array.from({ length: slotCount(props.config) }, (_, i) => props.config.dayStart + i * props.config.slotMinutes),
)

const BRUSHES: { mark: GridMark; label: string; key: string }[] = [
  { mark: 'AVAILABLE', label: 'Verfügbar', key: '1' },
  { mark: 'ONLINE_ONLY', label: 'Nur online', key: '2' },
  { mark: 'UNAVAILABLE', label: 'Nicht verfügbar (Radierer)', key: '3' },
]

function set(day: Weekday, i: number, mark: GridMark = brush.value) {
  props.grid[day][i] = mark
}

function start(day: Weekday, i: number, event: PointerEvent) {
  event.preventDefault()
  painting.value = true
  set(day, i)
}

/** Unter dem Zeiger liegende Zelle bestimmen – funktioniert auch bei Touch. */
function move(event: PointerEvent) {
  if (!painting.value) return
  const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
  const day = el?.dataset.day as Weekday | undefined
  const slot = el?.dataset.slot
  if (day && slot !== undefined) set(day, Number(slot))
}

function stop() {
  painting.value = false
}
window.addEventListener('pointerup', stop)
onBeforeUnmount(() => window.removeEventListener('pointerup', stop))

function fillDay(day: Weekday, mark: GridMark) {
  props.grid[day].fill(mark)
}

function clearAll() {
  for (const d of props.config.teachingDays) props.grid[d].fill('UNAVAILABLE')
}

function onKey(day: Weekday, i: number, event: KeyboardEvent) {
  const days = props.config.teachingDays
  const di = days.indexOf(day)
  const moves: Record<string, [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  }
  const brushKey = BRUSHES.find((b) => b.key === event.key)
  if (brushKey) {
    brush.value = brushKey.mark
    event.preventDefault()
  } else if (event.key === ' ' || event.key === 'Enter') {
    set(day, i)
    event.preventDefault()
  } else if (moves[event.key]) {
    const [dx, dy] = moves[event.key]!
    const nd = days[Math.max(0, Math.min(days.length - 1, di + dx))]!
    const ns = Math.max(0, Math.min(slots.value.length - 1, i + dy))
    document.querySelector<HTMLElement>(`[data-day="${nd}"][data-slot="${ns}"]`)?.focus()
    event.preventDefault()
  }
}

const markLabel: Record<GridMark, string> = {
  AVAILABLE: 'verfügbar',
  ONLINE_ONLY: 'nur online',
  UNAVAILABLE: 'nicht verfügbar',
}
</script>

<template>
  <div class="editor">
    <div class="toolbar">
      <div class="brushes" role="radiogroup" aria-label="Pinsel">
        <span class="label">Pinsel:</span>
        <button
          v-for="b in BRUSHES"
          :key="b.mark"
          type="button"
          role="radio"
          class="brush"
          :class="[`m-${b.mark}`, { active: brush === b.mark }]"
          :aria-checked="brush === b.mark"
          :title="`Taste ${b.key}`"
          @click="brush = b.mark"
        >
          <span class="sw" />{{ b.label }}
        </button>
      </div>
      <button type="button" class="btn-link" @click="clearAll">Alles zurücksetzen</button>
    </div>

    <div
      class="grid"
      :style="{ '--days': config.teachingDays.length, '--slots': slots.length }"
      @pointermove="move"
    >
      <div class="corner" />
      <div v-for="d in config.teachingDays" :key="d" class="dayhead">
        <span class="full">{{ WEEKDAY_LABEL[d] }}</span><span class="short">{{ WEEKDAY_SHORT[d] }}</span>
        <button type="button" class="dayfill" :title="`Ganzen ${WEEKDAY_LABEL[d]} mit Pinsel füllen`" @click="fillDay(d, brush)">
          ganzer Tag
        </button>
      </div>

      <template v-for="(t, i) in slots" :key="t">
        <div class="time" :class="{ full: t % 60 === 0 }">{{ t % 60 === 0 ? formatTime(t) : '' }}</div>
        <button
          v-for="d in config.teachingDays"
          :key="d"
          type="button"
          class="cell"
          :class="[`m-${grid[d][i]}`, { hour: t % 60 === 0 }]"
          :data-day="d"
          :data-slot="i"
          :aria-label="`${WEEKDAY_LABEL[d]} ${formatTime(t)}–${formatTime(t + config.slotMinutes)}: ${markLabel[grid[d][i]!]}`"
          @pointerdown="start(d, i, $event)"
          @keydown="onKey(d, i, $event)"
        />
      </template>
    </div>
    <p class="hint">
      Tipp: Mit gedrückter Maustaste über mehrere Zeiten ziehen. „ganzer Tag“ füllt den Tag mit dem
      gewählten Pinsel.
    </p>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.brushes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.brush {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--surface);
  cursor: pointer;
  font-size: 0.88rem;
}

.brush.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent);
  font-weight: 600;
}

.sw {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgb(0 0 0 / 15%);
}

.grid {
  display: grid;
  grid-template-columns: 48px repeat(var(--days), minmax(0, 1fr));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  user-select: none;
  touch-action: none;
  background: var(--surface);
}

.corner,
.dayhead {
  background: var(--surface-alt);
  border-bottom: 1px solid var(--border);
}

.dayhead {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px;
  font-weight: 600;
  font-size: 0.85rem;
  border-left: 1px solid var(--border);
}

.dayhead .short {
  display: none;
}

.dayfill {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 0.72rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.time {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-align: right;
  padding-right: 6px;
  line-height: 1;
  transform: translateY(-1px);
  font-variant-numeric: tabular-nums;
}

.cell {
  height: 20px;
  border: none;
  border-left: 1px solid var(--border);
  border-top: 1px dotted #ececf0;
  padding: 0;
  cursor: crosshair;
}

.cell.hour {
  border-top: 1px solid #e0e0e6;
}

.cell:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: -2px;
  z-index: 1;
}

.m-AVAILABLE {
  background: #b9e2bf;
}

.m-ONLINE_ONLY {
  background: #f7dc84;
}

.m-UNAVAILABLE {
  background: var(--surface);
}

.brush.m-UNAVAILABLE .sw {
  background: repeating-linear-gradient(-45deg, #fff, #fff 3px, #f3b7b7 3px, #f3b7b7 6px);
}

.brush.m-AVAILABLE,
.brush.m-ONLINE_ONLY,
.brush.m-UNAVAILABLE {
  background: var(--surface);
}

.brush.m-AVAILABLE .sw {
  background: #b9e2bf;
}

.brush.m-ONLINE_ONLY .sw {
  background: #f7dc84;
}

@media (max-width: 640px) {
  .dayhead .full {
    display: none;
  }

  .dayhead .short {
    display: inline;
  }
}
</style>

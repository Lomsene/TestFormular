<script setup lang="ts">
import { computed } from 'vue'
import type { PlanningConfig } from '../domain/config'
import { STATUS_LABEL, WEEKDAY_LABEL, WEEKDAY_SHORT, formatTime } from '../domain/format'
import type { AvailabilityResult, TimeWindow } from '../domain/types'

const props = defineProps<{
  result: AvailabilityResult
  config: PlanningConfig
  compact?: boolean
}>()

const span = computed(() => props.config.dayEnd - props.config.dayStart)

const hours = computed(() => {
  const list: number[] = []
  for (let t = Math.floor(props.config.dayStart / 60) * 60 + 60; t < props.config.dayEnd; t += 60)
    list.push(t)
  return list
})

const top = (minutes: number) => `${((minutes - props.config.dayStart) / span.value) * 100}%`
const height = (w: TimeWindow) => `${((w.end - w.start) / span.value) * 100}%`

function windowsOf(day: string) {
  return props.result.windows.filter((w) => w.weekday === day)
}

function sourceLabel(w: TimeWindow): string {
  switch (w.source.type) {
    case 'PRESIDIUM':
      return 'Präsidiumssitzung'
    case 'WISH':
      return props.result.windows.some((x) => x.source.type === 'WISH' && x.source.rank > 1)
        ? `Wunsch ${w.source.rank}`
        : 'Ihr Wunsch'
    default:
      return ''
  }
}

function title(w: TimeWindow): string {
  const extra = sourceLabel(w)
  return `${WEEKDAY_LABEL[w.weekday]} ${formatTime(w.start)}–${formatTime(w.end)}: ${statusLabel(w)}${extra ? ` (${extra})` : ''}`
}

function statusLabel(w: TimeWindow): string {
  return w.status === 'UNAVAILABLE' && w.hardness === 'SOFT'
    ? 'Möglichst nicht'
    : STATUS_LABEL[w.status]
}

/** Sehr kurze Fenster nur mit Farbe, ohne Beschriftung. */
const isTiny = (w: TimeWindow) => w.end - w.start < 60
</script>

<template>
  <div class="preview" :class="{ compact }">
    <div class="grid" :style="{ '--days': config.teachingDays.length }" aria-hidden="true">
      <div class="corner" />
      <div v-for="d in config.teachingDays" :key="d" class="dayhead">
        {{ compact ? WEEKDAY_SHORT[d] : WEEKDAY_LABEL[d] }}
      </div>

      <div class="times">
        <span v-for="h in hours" :key="h" :style="{ top: top(h) }">{{ formatTime(h) }}</span>
      </div>
      <div v-for="d in config.teachingDays" :key="d" class="daycol">
        <span v-for="h in hours" :key="h" class="hourline" :style="{ top: top(h) }" />
        <div
          v-for="(w, i) in windowsOf(d)"
          :key="i"
          class="win"
          :class="[`st-${w.status}`, `hd-${w.hardness}`]"
          :style="{ top: top(w.start), height: height(w) }"
          :title="title(w)"
        >
          <template v-if="!isTiny(w)">
            <strong>{{ statusLabel(w) }}</strong>
            <span v-if="!compact">{{ formatTime(w.start) }}–{{ formatTime(w.end) }}</span>
            <em v-if="!compact && sourceLabel(w)">{{ sourceLabel(w) }}</em>
          </template>
        </div>
      </div>
    </div>

    <!-- Für Screenreader: dieselben Informationen als Liste -->
    <ul class="visually-hidden">
      <li v-for="(w, i) in result.windows" :key="i">{{ title(w) }}</li>
    </ul>

    <p v-if="result.constraints.maxUnitsPerDay" class="constraint">
      An jedem Tag höchstens
      <strong>{{ result.constraints.maxUnitsPerDay.units }} Unterrichtsstunden</strong>
    </p>

    <ul class="legend">
      <li><span class="sw st-PREFERRED" />Bevorzugt</li>
      <li><span class="sw st-AVAILABLE" />Verfügbar</li>
      <li><span class="sw st-ONLINE_ONLY" />Nur online</li>
      <li><span class="sw st-UNAVAILABLE hd-SOFT" />Möglichst nicht (Wunsch)</li>
      <li><span class="sw st-UNAVAILABLE hd-HARD" />Nicht verfügbar (verbindlich)</li>
    </ul>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 44px repeat(var(--days), minmax(0, 1fr));
  grid-template-rows: auto 380px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
}

.compact .grid {
  grid-template-rows: auto 300px;
}

.dayhead {
  padding: 8px 4px;
  text-align: center;
  font-weight: 600;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border);
  border-left: 1px solid var(--border);
  background: var(--surface-alt);
}

.corner {
  border-bottom: 1px solid var(--border);
  background: var(--surface-alt);
}

.times,
.daycol {
  position: relative;
}

.daycol {
  border-left: 1px solid var(--border);
}

.times span {
  position: absolute;
  right: 6px;
  transform: translateY(-50%);
  font-size: 0.7rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.compact .win strong {
  font-size: 0.68rem;
  hyphens: auto;
  overflow-wrap: anywhere;
}

.hourline {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid #ececf0;
}

.win {
  position: absolute;
  left: 3px;
  right: 3px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 6px;
  border-radius: 4px;
  border-left: 4px solid;
  font-size: 0.75rem;
  line-height: 1.25;
  overflow: hidden;
  transition:
    top 0.2s,
    height 0.2s,
    background 0.2s;
}

.win + .win {
  margin-top: 1px;
}

.win em {
  font-style: normal;
  opacity: 0.85;
}

.st-PREFERRED {
  background: var(--st-preferred-bg);
  border-color: var(--st-preferred);
  color: #0f5223;
}

.st-AVAILABLE {
  background: var(--st-available-bg);
  border-color: var(--st-available);
  color: #24602a;
}

.st-ONLINE_ONLY {
  background: var(--st-online-bg);
  border-color: var(--st-online);
  color: #6b4f00;
}

.st-UNAVAILABLE {
  background: var(--st-unavailable-bg);
  border-color: var(--st-unavailable);
  color: #8e1c1c;
}

.st-UNAVAILABLE.hd-SOFT {
  background: repeating-linear-gradient(
    -45deg,
    var(--st-unavailable-bg),
    var(--st-unavailable-bg) 6px,
    #f6c4c4 6px,
    #f6c4c4 12px
  );
}

.st-UNAVAILABLE.hd-HARD {
  background: #f3b7b7;
}

.constraint {
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--st-online-bg);
  border-left: 4px solid var(--st-online);
  font-size: 0.9rem;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sw {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border-left: 4px solid;
}
</style>

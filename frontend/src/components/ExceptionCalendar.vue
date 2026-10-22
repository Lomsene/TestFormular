<script setup lang="ts">
import { computed, ref } from 'vue'
import { blockWeeks, isInBlock, weekdayOf, type BlockDay } from '../domain/calendar'
import type { PlanningConfig } from '../domain/config'
import { WEEKDAY_LABEL, WEEKDAY_SHORT, formatDate, formatTime } from '../domain/format'
import type { DateException, TheoryBlock } from '../domain/types'
import type { Issue } from '../domain/validation'
import FieldMessages from './FieldMessages.vue'

/**
 * Optionale Abweichungen an einzelnen Tagen des Theorieblocks („am 12.02. geht es doch nicht“).
 * Klick auf einen Tag markiert ihn als „geht nicht“, Klick auf die Woche markiert alle Tage.
 * In der Liste darunter lässt sich je Tag auf „geht doch“ oder eine Uhrzeit umstellen.
 */
const props = defineProps<{
  exceptions: DateException[]
  block: TheoryBlock
  config: PlanningConfig
  issuesFor: (field: string) => Issue[]
}>()

const weeks = computed(() => blockWeeks(props.block, props.config))
const open = ref(props.exceptions.some((e) => isInBlock(e.date, props.block)))

const byDate = computed(() => new Map(props.exceptions.map((e) => [e.date, e])))

/** Nur Abweichungen im aktuellen Block, nach Datum – Index passt zu den Prüfmeldungen. */
const visible = computed(() =>
  props.exceptions
    .filter((e) => isInBlock(e.date, props.block))
    .sort((a, b) => a.date.localeCompare(b.date)),
)

/** Haken entfernen = keine Besonderheiten: Markierungen im Block werden verworfen. */
function setOpen(value: boolean) {
  open.value = value
  if (!value) {
    for (const e of visible.value) remove(e.date)
  }
}

function add(date: string) {
  props.exceptions.push({ date, mark: 'UNAVAILABLE', time: null })
}

function remove(date: string) {
  const i = props.exceptions.findIndex((e) => e.date === date)
  if (i >= 0) props.exceptions.splice(i, 1)
}

function toggleDay(day: BlockDay) {
  if (!day.inBlock) return
  if (byDate.value.has(day.date)) remove(day.date)
  else add(day.date)
}

function toggleWeek(days: BlockDay[]) {
  const inBlock = days.filter((d) => d.inBlock)
  const allMarked = inBlock.every((d) => byDate.value.has(d.date))
  for (const d of inBlock) {
    if (allMarked) remove(d.date)
    else if (!byDate.value.has(d.date)) add(d.date)
  }
}

function setPartial(e: DateException, partial: boolean) {
  const { dayStart, dayEnd } = props.config
  // Vorschlag: der Vormittag – meist wird nur ein Teil des Tages geändert.
  e.time = partial ? { start: dayStart, end: Math.min(dayStart + 4 * 60, dayEnd) } : null
}

const timeOptions = computed(() => {
  const list: number[] = []
  const { dayStart, dayEnd, slotMinutes } = props.config
  for (let t = dayStart; t <= dayEnd; t += slotMinutes) list.push(t)
  return list
})

function longDate(iso: string): string {
  const weekday = weekdayOf(iso)
  return weekday ? `${WEEKDAY_SHORT[weekday]}, ${formatDate(iso)}` : formatDate(iso)
}

const short = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`

function dayLabel(day: BlockDay): string {
  const e = byDate.value.get(day.date)
  const state = !day.inBlock
    ? 'außerhalb des Blocks'
    : !e
      ? 'wie im Raster'
      : e.mark === 'UNAVAILABLE'
        ? 'geht nicht'
        : 'geht doch'
  return `${WEEKDAY_LABEL[day.weekday]}, ${formatDate(day.date)}: ${state}`
}
</script>

<template>
  <div class="exceptions">
    <h3>Besonderheiten im Theorieblock <span class="optional">optional</span></h3>
    <label class="toggle" :class="{ on: open }">
      <input
        type="checkbox"
        :checked="open"
        aria-controls="exception-calendar"
        @change="setOpen(($event.target as HTMLInputElement).checked)"
      />
      <span>
        <strong>Ja, in einzelnen Wochen ist es anders</strong>
        <span class="toggle-desc">z. B. Urlaub oder andere Termine an bestimmten Tagen</span>
      </span>
    </label>
    <p v-if="open && visible.length" class="hint">
      Haken entfernen löscht alle {{ visible.length }} markierten Tage.
    </p>

    <div v-if="open" id="exception-calendar">
      <p class="hint how">
        Klicken Sie auf einen Tag, an dem es <strong>nicht geht</strong>. Ein Klick auf „Woche“
        markiert die ganze Woche. Nochmals klicken entfernt die Markierung.
      </p>

      <div class="cal" :style="{ '--days': config.teachingDays.length }">
        <div class="cal-head">Woche</div>
        <div v-for="d in config.teachingDays" :key="d" class="cal-head">
          {{ WEEKDAY_SHORT[d] }}
        </div>

        <template v-for="w in weeks" :key="w.number">
          <button
            type="button"
            class="week"
            :aria-label="`Woche ${w.number} ganz umschalten`"
            @click="toggleWeek(w.days)"
          >
            Woche {{ w.number }}
          </button>
          <button
            v-for="day in w.days"
            :key="day.date"
            type="button"
            class="day"
            :class="byDate.get(day.date) && `m-${byDate.get(day.date)!.mark}`"
            :disabled="!day.inBlock"
            :aria-pressed="byDate.has(day.date)"
            :aria-label="dayLabel(day)"
            @click="toggleDay(day)"
          >
            {{ short(day.date) }}
            <span v-if="byDate.get(day.date)?.time" class="partial" aria-hidden="true">◐</span>
          </button>
        </template>
      </div>

      <ul v-if="visible.length" class="list">
        <li v-for="(e, i) in visible" :key="e.date">
          <div class="item">
            <strong class="date">{{ longDate(e.date) }}</strong>
            <select
              v-model="e.mark"
              class="select small"
              :aria-label="`${formatDate(e.date)}: Art`"
            >
              <option value="UNAVAILABLE">geht nicht</option>
              <option value="AVAILABLE">geht ausnahmsweise doch</option>
            </select>
            <label class="check">
              <input
                type="checkbox"
                :checked="e.time !== null"
                @change="setPartial(e, ($event.target as HTMLInputElement).checked)"
              />
              nur zeitweise
            </label>
            <span v-if="e.time" class="times">
              <select
                v-model.number="e.time.start"
                class="select small"
                :aria-label="`${formatDate(e.date)}: von`"
              >
                <option v-for="t in timeOptions.slice(0, -1)" :key="t" :value="t">
                  {{ formatTime(t) }}
                </option>
              </select>
              bis
              <select
                v-model.number="e.time.end"
                class="select small"
                :aria-label="`${formatDate(e.date)}: bis`"
              >
                <option v-for="t in timeOptions.slice(1)" :key="t" :value="t">
                  {{ formatTime(t) }}
                </option>
              </select>
              Uhr
            </span>
            <button
              type="button"
              class="btn-link remove"
              :aria-label="`${formatDate(e.date)} entfernen`"
              @click="remove(e.date)"
            >
              Entfernen
            </button>
          </div>
          <FieldMessages :issues="issuesFor(`exceptions.${i}`)" />
        </li>
      </ul>

      <ul class="legend">
        <li><span class="sw m-UNAVAILABLE" />geht nicht</li>
        <li><span class="sw m-AVAILABLE" />geht ausnahmsweise doch</li>
        <li><span class="sw" />wie im Raster oben</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.exceptions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

h3 {
  font-size: 1.05rem;
}

.toggle {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
}

.toggle:hover,
.toggle.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.toggle:has(input:focus-visible) {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.toggle input {
  width: 20px;
  height: 20px;
  margin: 1px 0 0;
  flex: none;
  accent-color: var(--accent);
}

.toggle-desc {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.optional {
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  vertical-align: 2px;
}

.how {
  margin: 12px 0 10px;
}

.cal {
  display: grid;
  grid-template-columns: max-content repeat(var(--days), minmax(0, 1fr));
  gap: 4px;
}

.cal-head {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
}

.week,
.day {
  min-height: 34px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.week {
  padding: 0 10px;
  background: var(--surface-alt);
  color: var(--accent);
  font-weight: 600;
}

.day:hover:not(:disabled),
.week:hover {
  border-color: var(--accent);
}

.day:disabled {
  opacity: 0.35;
  cursor: default;
}

.day.m-UNAVAILABLE {
  background: var(--st-unavailable-bg);
  border-color: var(--st-unavailable);
  color: #8e1c1c;
  font-weight: 600;
}

.day.m-AVAILABLE {
  background: var(--st-available-bg);
  border-color: var(--st-available);
  color: #24602a;
  font-weight: 600;
}

.partial {
  margin-left: 2px;
}

.list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-alt);
  border: 1px solid var(--border);
}

.date {
  min-width: 120px;
  font-variant-numeric: tabular-nums;
}

.select.small {
  width: auto;
  min-height: 34px;
  padding: 4px 8px;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.check input {
  accent-color: var(--accent);
}

.times {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.remove {
  margin-left: auto;
  font-size: 0.85rem;
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
  border: 1px solid var(--border-strong);
  background: var(--surface);
}

.sw.m-UNAVAILABLE {
  background: var(--st-unavailable-bg);
  border-color: var(--st-unavailable);
}

.sw.m-AVAILABLE {
  background: var(--st-available-bg);
  border-color: var(--st-available);
}

@media (max-width: 560px) {
  .week {
    padding: 0 4px;
    font-size: 0.75rem;
  }

  .day {
    font-size: 0.72rem;
  }
}
</style>

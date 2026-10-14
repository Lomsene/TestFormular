<script setup lang="ts">
import { computed } from 'vue'
import { blockLabel, type PlanningConfig } from '../domain/config'
import { STATUS_LABEL, WEEKDAY_LABEL, describeWish, formatTime } from '../domain/format'
import type { AvailabilityExport, TimeWindow } from '../domain/types'
import WeekPreview from './WeekPreview.vue'

/** Zusammenfassung + Zeitfenster – genutzt im Prüfschritt und nach dem Absenden. */
const props = defineProps<{
  data: AvailabilityExport
  config: PlanningConfig
  /** Im Prüfschritt: Abschnitte lassen sich direkt zum Bearbeiten anspringen. */
  editable?: boolean
}>()
defineEmits<{ edit: [step: 'person' | 'wish' | 'lastBlock' | 'presidium' | 'grid'] }>()

const KIND_LABEL = {
  FULL_TIME: 'Hauptamtlich Lehrende/r',
  FREELANCE: 'Freiberufliche/r Dozierende/r',
  PART_TIME: 'Teilzeitbeschäftigte/r Dozierende/r',
} as const

const LAST_BLOCK_LABEL = {
  YES: 'Ja, wurde berücksichtigt',
  NO: 'Nein, wurde nicht berücksichtigt',
  NO_WISH: 'Kein Wunsch geäußert',
} as const

const canTeach = (w: TimeWindow) => w.status !== 'UNAVAILABLE'

const byDay = computed(() =>
  props.data.frame.teachingDays.map((day) => {
    const windows = props.data.result.windows.filter((w) => w.weekday === day)
    return { day, can: windows.filter(canTeach), cannot: windows.filter((w) => !canTeach(w)) }
  }),
)

function describe(w: TimeWindow): string {
  const time = `${formatTime(w.start)}–${formatTime(w.end)} Uhr`
  if (w.status === 'UNAVAILABLE') {
    if (w.source.type === 'PRESIDIUM') return `${time} (Präsidiumssitzung)`
    return w.hardness === 'HARD' ? time : `${time} (Wunsch)`
  }
  return w.status === 'AVAILABLE' ? time : `${time} (${STATUS_LABEL[w.status].toLowerCase()})`
}

const answers = computed(() => props.data.answers)
const wishes = computed(() =>
  answers.value.kind === 'FULL_TIME' ? answers.value.wishes.map(describeWish) : [],
)

function sameLabel(ref: { blockId: string } | null | undefined): string {
  return ref ? `wie im letzten Jahr (${blockLabel(ref.blockId)})` : ''
}
</script>

<template>
  <section class="card" aria-labelledby="sum-head">
    <h2 id="sum-head" class="h2">Ihre Angaben</h2>
    <dl class="summary">
      <dt>Name</dt>
      <dd>
        {{ data.lecturer.lastName || '–' }}, {{ data.lecturer.firstName || '–' }}
        <button
          v-if="editable"
          type="button"
          class="btn-link edit"
          @click="$emit('edit', 'person')"
        >
          ändern
        </button>
      </dd>
      <dt>E-Mail</dt>
      <dd>{{ data.lecturer.email || '–' }}</dd>
      <dt>Art</dt>
      <dd>{{ KIND_LABEL[data.lecturer.kind] }}</dd>
      <dt>Theorieblock</dt>
      <dd>{{ data.block.label }}</dd>

      <template v-if="answers.kind === 'FULL_TIME'">
        <dt>Terminwunsch</dt>
        <dd>
          <span v-if="answers.sameAsPreviousYear.wishes" class="same">
            {{ sameLabel(answers.sameAsPreviousYear.wishes) }}
          </span>
          <template
            v-if="answers.sameAsPreviousYear.wishes && !answers.sameAsPreviousYear.wishes.resolved"
          >
            · wird von der Stundenplanung übernommen
          </template>
          <template v-else-if="wishes.length === 0">Kein Wunsch, freie Einplanung</template>
          <template v-else-if="wishes.length === 1">„{{ wishes[0] }}“</template>
          <ol v-else class="wishes">
            <li v-for="(w, i) in wishes" :key="i">„{{ w }}“</li>
          </ol>
          <button
            v-if="editable"
            type="button"
            class="btn-link edit"
            @click="$emit('edit', 'wish')"
          >
            ändern
          </button>
        </dd>
        <dt>Letzter Block</dt>
        <dd>
          {{
            answers.wishConsideredLastBlock
              ? LAST_BLOCK_LABEL[answers.wishConsideredLastBlock]
              : '–'
          }}
          <template v-if="data.result.priorityClaim"
            >· Anspruch auf bevorzugte Berücksichtigung</template
          >
          <button
            v-if="editable"
            type="button"
            class="btn-link edit"
            @click="$emit('edit', 'lastBlock')"
          >
            ändern
          </button>
        </dd>
        <dt>Präsidium</dt>
        <dd>
          <span v-if="answers.sameAsPreviousYear.presidium" class="same">
            {{ sameLabel(answers.sameAsPreviousYear.presidium) }}
          </span>
          <template
            v-if="
              answers.sameAsPreviousYear.presidium && !answers.sameAsPreviousYear.presidium.resolved
            "
          >
            · wird von der Stundenplanung übernommen
          </template>
          <template v-else-if="answers.presidium.isMember && answers.presidium.sessionWeekday">
            Mitglied, Sitzungen {{ WEEKDAY_LABEL[answers.presidium.sessionWeekday] }}
          </template>
          <template v-else>Kein Mitglied</template>
          <button
            v-if="editable"
            type="button"
            class="btn-link edit"
            @click="$emit('edit', 'presidium')"
          >
            ändern
          </button>
        </dd>
      </template>

      <template v-else>
        <dt>Verfügbarkeit</dt>
        <dd>
          <span v-if="answers.sameAsPreviousYear" class="same">
            {{ sameLabel(answers.sameAsPreviousYear) }}
          </span>
          <template v-if="answers.sameAsPreviousYear && !answers.sameAsPreviousYear.resolved">
            · wird von der Stundenplanung übernommen
          </template>
          <template v-else-if="!answers.sameAsPreviousYear">siehe Zeitfenster unten</template>
          <button
            v-if="editable"
            type="button"
            class="btn-link edit"
            @click="$emit('edit', 'grid')"
          >
            ändern
          </button>
        </dd>
        <template v-if="answers.note">
          <dt>Anmerkungen</dt>
          <dd>{{ answers.note }}</dd>
        </template>
      </template>
    </dl>
  </section>

  <section class="card" aria-labelledby="win-head">
    <h2 id="win-head" class="h2">Ihre Zeitfenster</h2>
    <p class="hint">So geht Ihre Verfügbarkeit in die Stundenplanung ein.</p>
    <p v-if="data.result.pendingPreviousYear" class="notice notice-info pending">
      Ihre Angaben aus dem letzten Jahr lagen diesem Formular nicht vor. Die Stundenplanung ergänzt
      sie. Die Zeitfenster unten enthalten diesen Teil deshalb noch nicht.
    </p>
    <table class="windows">
      <thead>
        <tr>
          <th scope="col">Tag</th>
          <th scope="col"><span class="sw can" />Kann</th>
          <th scope="col"><span class="sw cannot" />Kann nicht</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in byDay" :key="row.day">
          <th scope="row">{{ WEEKDAY_LABEL[row.day] }}</th>
          <td>
            <span v-for="(w, i) in row.can" :key="i" class="pill" :class="`st-${w.status}`">
              {{ describe(w) }}
            </span>
            <span v-if="!row.can.length" class="none">–</span>
          </td>
          <td>
            <span v-for="(w, i) in row.cannot" :key="i" class="pill" :class="`hd-${w.hardness}`">
              {{ describe(w) }}
            </span>
            <span v-if="!row.cannot.length" class="none">–</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="data.result.constraints.maxUnitsPerDay" class="constraint">
      Zusätzlich: an jedem Tag höchstens
      {{ data.result.constraints.maxUnitsPerDay.units }} Unterrichtsstunden.
    </p>
    <div class="week">
      <WeekPreview :result="data.result" :config="config" />
    </div>
  </section>
</template>

<style scoped>
.h2 {
  font-size: 1.15rem;
  margin-bottom: 10px;
}

.summary {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 20px;
  margin: 0;
}

.summary dt {
  font-weight: 600;
  color: var(--text-muted);
}

.summary dd {
  margin: 0;
}

.edit {
  margin-left: 8px;
  font-size: 0.85rem;
}

.same {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
  font-size: 0.88rem;
}

.wishes {
  margin: 0;
  padding-left: 1.2em;
}

.pending {
  margin: 10px 0 0;
}

.windows {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 0.92rem;
}

.windows th,
.windows td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

.windows thead th {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.sw {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 6px;
}

.sw.can {
  background: var(--st-available);
}

.sw.cannot {
  background: var(--st-unavailable);
}

.pill {
  display: inline-block;
  margin: 2px 6px 2px 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.st-AVAILABLE {
  background: var(--st-available-bg);
}

.st-PREFERRED {
  background: var(--st-preferred-bg);
  font-weight: 600;
}

.st-ONLINE_ONLY {
  background: var(--st-online-bg);
}

.hd-SOFT {
  background: var(--st-unavailable-bg);
}

.hd-HARD {
  background: #f3b7b7;
  font-weight: 600;
}

.none {
  color: var(--text-muted);
}

.constraint {
  margin: 12px 0 0;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--st-online-bg);
}

.week {
  margin-top: 20px;
}

@media (max-width: 560px) {
  .summary {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .summary dd {
    margin-bottom: 8px;
  }

  .windows thead {
    display: none;
  }

  .windows tr {
    display: grid;
    border-bottom: 1px solid var(--border);
  }

  .windows th,
  .windows td {
    border: none;
    padding: 4px 0;
  }
}
</style>

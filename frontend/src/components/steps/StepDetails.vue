<script setup lang="ts">
import { computed } from 'vue'
import type { AvailabilityForm, PresidiumAnswer } from '../../composables/useAvailabilityForm'
import { blockLabel } from '../../domain/config'
import { WEEKDAY_LABEL, WEEKDAY_SHORT } from '../../domain/format'
import type { Weekday } from '../../domain/types'
import ChoiceGroup, { type Choice } from '../ChoiceGroup.vue'
import FieldMessages from '../FieldMessages.vue'
import PreviousYearPanel from '../PreviousYearPanel.vue'

/** Zwei kurze Fragen für Hauptamtliche: letzter Block und Präsidium. */
const props = defineProps<{ form: AvailabilityForm }>()
const { state, config, issuesFor, previousBlockId, previousFullTime, adoptPreviousPresidium } =
  props.form
const ft = state.fullTime
const p = ft.presidium

const answerOptions = computed<Choice<PresidiumAnswer>[]>(() => [
  { value: 'NO', label: 'Nein' },
  { value: 'YES', label: 'Ja' },
  {
    value: 'SAME_AS_LAST_YEAR',
    label: 'Wie im letzten Jahr',
    disabled: !previousBlockId.value,
  },
])

const weekdayOptions = computed(() =>
  config.teachingDays.map((d) => ({ value: d as Weekday, label: WEEKDAY_SHORT[d] })),
)
const previous = computed(() => previousFullTime.value?.presidium ?? null)
</script>

<template>
  <section class="card" aria-labelledby="step-head">
    <h2 id="step-head" class="step-title" tabindex="-1">Weitere Angaben</h2>

    <div class="question">
      <ChoiceGroup
        v-model="ft.wishConsideredLastBlock"
        name="lastBlock"
        legend="Wurde Ihr Terminwunsch im letzten Theorieblock berücksichtigt?"
        :options="[
          { value: 'YES', label: 'Ja' },
          { value: 'NO', label: 'Nein' },
          { value: 'NO_WISH', label: 'Ich hatte keinen Wunsch' },
        ]"
        :invalid="issuesFor('lastBlock').some((i) => i.severity === 'error')"
      />
      <FieldMessages :issues="issuesFor('lastBlock')" />
      <p
        v-if="ft.wishConsideredLastBlock === 'NO'"
        class="notice notice-success claim"
        role="status"
      >
        Dann wird Ihr Wunsch diesmal <strong>bevorzugt berücksichtigt</strong>.
      </p>
    </div>

    <div class="question">
      <ChoiceGroup
        v-model="p.answer"
        name="presidium"
        legend="Sind Sie Mitglied des Präsidiums?"
        :options="answerOptions"
      />

      <div v-if="p.answer === 'YES'" class="session">
        <ChoiceGroup
          v-model="p.sessionWeekday"
          name="sessionWeekday"
          legend="An welchem Tag sind die Sitzungen?"
          :options="weekdayOptions"
          :invalid="issuesFor('presidium.sessionWeekday').some((i) => i.severity === 'error')"
        />
        <p class="hint">An diesem Tag gibt es keine Lehre. Das zählt nicht als Terminwunsch.</p>
      </div>
      <FieldMessages :issues="issuesFor('presidium.sessionWeekday')" />

      <PreviousYearPanel
        v-if="p.answer === 'SAME_AS_LAST_YEAR'"
        :previous-block-id="previousBlockId"
        :found="previousFullTime !== null"
        :email="state.lecturer.email"
        @adopt="adoptPreviousPresidium"
      >
        <template v-if="previous?.isMember && previous.sessionWeekday">
          Mitglied des Präsidiums, Sitzungen {{ WEEKDAY_LABEL[previous.sessionWeekday] }}
        </template>
        <template v-else>Kein Mitglied des Präsidiums</template>
      </PreviousYearPanel>
      <p v-else-if="previousBlockId" class="hint">
        „Wie im letzten Jahr“ heißt: wie im {{ blockLabel(previousBlockId) }}.
      </p>
    </div>
  </section>
</template>

<style scoped>
.question + .question {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.claim {
  margin: 12px 0 0;
}

.session {
  margin-top: 16px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import type { AvailabilityForm, PresidiumAnswer } from '../../composables/useAvailabilityForm'
import { blockLabel } from '../../domain/config'
import { WEEKDAY_LABEL, WEEKDAY_SHORT } from '../../domain/format'
import type { Weekday } from '../../domain/types'
import ChoiceGroup, { type Choice } from '../ChoiceGroup.vue'
import FieldMessages from '../FieldMessages.vue'
import PreviousYearPanel from '../PreviousYearPanel.vue'

const props = defineProps<{ form: AvailabilityForm }>()
const { state, config, issuesFor, previousBlockId, previousFullTime, adoptPreviousPresidium } =
  props.form
const p = state.fullTime.presidium

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
    <h2 id="step-head" class="step-title" tabindex="-1">Präsidium</h2>
    <ChoiceGroup
      v-model="p.answer"
      name="presidium"
      legend="Sind Sie Mitglied des Präsidiums?"
      :options="answerOptions"
    />
    <p v-if="previousBlockId" class="hint">
      „Wie im letzten Jahr“ bedeutet: wie im {{ blockLabel(previousBlockId) }}.
    </p>

    <div v-if="p.answer === 'YES'" class="session">
      <ChoiceGroup
        v-model="p.sessionWeekday"
        name="sessionWeekday"
        legend="An welchem Wochentag finden die Präsidiumssitzungen statt?"
        :options="weekdayOptions"
        :invalid="issuesFor('presidium.sessionWeekday').some((i) => i.severity === 'error')"
      />
      <p class="hint">
        An diesem Tag werden Sie nicht in der Lehre eingesetzt. Der Sitzungstag zählt
        <strong>nicht</strong> als Terminwunsch.
      </p>
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
  </section>
</template>

<style scoped>
.session {
  margin-top: 16px;
}
</style>

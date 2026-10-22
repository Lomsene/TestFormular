<script setup lang="ts">
import { computed } from 'vue'
import type { AvailabilityForm, GridMode } from '../../composables/useAvailabilityForm'
import { blockLabel } from '../../domain/config'
import ChoiceGroup, { type Choice } from '../ChoiceGroup.vue'
import ExceptionCalendar from '../ExceptionCalendar.vue'
import FieldMessages from '../FieldMessages.vue'
import PreviousYearPanel from '../PreviousYearPanel.vue'
import WeekGridEditor from '../WeekGridEditor.vue'
import WeekPreview from '../WeekPreview.vue'

const props = defineProps<{ form: AvailabilityForm; kind: 'FREELANCE' | 'PART_TIME' }>()
const {
  state,
  config,
  block,
  issuesFor,
  previousBlockId,
  previousGrid,
  adoptPreviousGrid,
  result,
} = props.form

const data = computed(() => (props.kind === 'FREELANCE' ? state.freelance : state.partTime))
const previous = computed(() => previousGrid(props.kind))

const modeOptions = computed<Choice<GridMode>[]>(() => [
  { value: 'OWN', label: 'Zeiten eintragen', description: 'Ich markiere meine Zeiten im Raster.' },
  {
    value: 'SAME_AS_LAST_YEAR',
    label: 'Wie im letzten Jahr',
    description: previousBlockId.value
      ? `Gleiche Zeiten wie im ${blockLabel(previousBlockId.value)}.`
      : 'Für diesen Block nicht möglich.',
    disabled: !previousBlockId.value,
  },
])
</script>

<template>
  <section class="card" aria-labelledby="step-head">
    <h2 id="step-head" class="step-title" tabindex="-1">
      {{
        kind === 'FREELANCE'
          ? 'Wann können Sie lehren?'
          : 'Wann stehen Sie für Lehre zur Verfügung?'
      }}
    </h2>
    <p class="notice notice-warning provisional">
      <strong>Vorläufige Fassung:</strong> Die Regeln für
      {{ kind === 'FREELANCE' ? 'freiberufliche' : 'teilzeitbeschäftigte' }} Dozierende werden noch
      festgelegt.
    </p>

    <ChoiceGroup
      v-model="data.mode"
      :name="`grid-mode-${kind}`"
      legend="Wie möchten Sie Ihre Zeiten angeben?"
      variant="cards"
      :options="modeOptions"
    />

    <template v-if="data.mode === 'OWN'">
      <p class="hint grid-hint">
        Markieren Sie die Zeiten, in denen Sie in einer normalen Woche lehren können. Alles
        Unmarkierte gilt als <em>nicht verfügbar</em>.
      </p>
      <WeekGridEditor :grid="data.grid" :config="config" />
      <FieldMessages :issues="issuesFor('grid')" />
    </template>

    <PreviousYearPanel
      v-else
      :previous-block-id="previousBlockId"
      :found="previous !== null"
      :email="state.lecturer.email"
      @adopt="adoptPreviousGrid(kind)"
    >
      <WeekPreview :result="result" :config="config" compact />
    </PreviousYearPanel>

    <ExceptionCalendar
      :exceptions="data.exceptions"
      :block="block"
      :config="config"
      :issues-for="issuesFor"
    />

    <div class="field note">
      <label :for="'note-' + kind">Anmerkungen (optional)</label>
      <textarea
        :id="'note-' + kind"
        v-model="data.note"
        class="textarea"
        rows="3"
        maxlength="1000"
        placeholder="z. B. „Online-Termine bitte nur nachmittags“"
      />
    </div>
  </section>
</template>

<style scoped>
.provisional {
  margin: 0 0 16px;
}

.grid-hint {
  margin: 16px 0 10px;
}

.note {
  margin-top: 18px;
}

.textarea {
  resize: vertical;
}
</style>

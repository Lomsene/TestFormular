<script setup lang="ts">
import { computed, watch } from 'vue'
import type { AvailabilityForm } from '../../composables/useAvailabilityForm'
import { blockLabel } from '../../domain/config'
import { EVERY_DAY, draftToWish } from '../../domain/draft'
import { WEEKDAY_ADVERB, describeWish } from '../../domain/format'
import { MAX_WISHES_WITH_EXCEPTION } from '../../domain/validation'
import FieldMessages from '../FieldMessages.vue'
import PreviousYearPanel from '../PreviousYearPanel.vue'
import WishEditor from '../WishEditor.vue'

/**
 * Terminwunsch Schritt für Schritt – je Bildschirm genau eine Frage:
 * answer: Haben Sie einen Wunsch? → day: An welchem Tag? → what: Was genau?
 * Weitere Wünsche (Ausnahmefall) stehen kompakt im letzten Schritt.
 */
const props = defineProps<{ form: AvailabilityForm; part: 'answer' | 'day' | 'what' }>()
const {
  state,
  config,
  issuesFor,
  addExtraWish,
  removeWish,
  previousBlockId,
  previousFullTime,
  adoptPreviousWishes,
} = props.form
const ft = state.fullTime

const first = computed(() => ft.drafts[0]!)
const isSame = computed(() => first.value.answer === 'SAME_AS_LAST_YEAR')
const extras = computed(() => ft.drafts.slice(1))
const canAddExtra = computed(
  () => draftToWish(first.value) !== null && ft.drafts.length < MAX_WISHES_WITH_EXCEPTION,
)

// „Kein Wunsch“ oder „wie im letzten Jahr“: Zusätzliche Wünsche ergeben keinen Sinn mehr.
watch(
  () => first.value.answer,
  (answer) => {
    if (answer !== 'WISH') {
      while (ft.drafts.length > 1) removeWish(ft.drafts.length - 1)
    }
  },
)

const previousLabel = computed(() =>
  previousBlockId.value ? blockLabel(previousBlockId.value) : null,
)
const previousWishes = computed(() => previousFullTime.value?.wishes.map(describeWish) ?? [])

const title = computed(() => {
  switch (props.part) {
    case 'answer':
      return 'Haben Sie einen Terminwunsch?'
    case 'day':
      return 'An welchem Tag?'
    case 'what': {
      const day = first.value.day
      if (day === EVERY_DAY) return 'Wie viele Stunden höchstens pro Tag?'
      return day ? `Was wünschen Sie sich ${WEEKDAY_ADVERB[day]}?` : 'Was wünschen Sie sich?'
    }
  }
})
</script>

<template>
  <section class="card" aria-labelledby="step-head">
    <h2 id="step-head" class="step-title" tabindex="-1">{{ title }}</h2>

    <p v-if="part === 'answer'" class="hint intro">
      Ein Wunsch gilt für einen Wochentag. Er wird berücksichtigt, soweit die Planung es zulässt.
    </p>
    <p v-else-if="part === 'day'" class="hint intro">
      Ein Terminwunsch bezieht sich immer auf genau einen Wochentag.
    </p>

    <WishEditor
      :draft="first"
      :index="0"
      :config="config"
      :issues-for="issuesFor"
      :part="part"
      :previous-label="previousLabel"
    />

    <!-- Wie im letzten Jahr -->
    <template v-if="part === 'answer' && isSame">
      <PreviousYearPanel
        :previous-block-id="previousBlockId"
        :found="previousFullTime !== null"
        :email="state.lecturer.email"
        @adopt="adoptPreviousWishes"
      >
        <template v-if="previousWishes.length === 0">Kein Wunsch (freie Einplanung)</template>
        <ul v-else class="prev-list">
          <li v-for="(w, i) in previousWishes" :key="i">„{{ w }}“</li>
        </ul>
      </PreviousYearPanel>
      <FieldMessages :issues="issuesFor('wish.0.weekday')" />
    </template>

    <!-- Weitere Wünsche (Ausnahmefall) -->
    <template v-if="part === 'what'">
      <div v-for="(draft, j) in extras" :key="j + 1" class="extra">
        <div class="extra-head">
          <h3>Weiterer Wunsch {{ j + 2 }} <span class="tag">Ausnahmefall</span></h3>
          <button type="button" class="btn-link" @click="removeWish(j + 1)">Entfernen</button>
        </div>
        <WishEditor
          :draft="draft"
          :index="j + 1"
          :config="config"
          :issues-for="issuesFor"
          part="compact"
        />
      </div>

      <div v-if="extras.length" class="exception">
        <label class="check">
          <input v-model="ft.exceptionAgreedWithPresidium" type="checkbox" />
          <span>
            Ich habe den zusätzlichen Wunsch vorab mit dem Präsidium abgestimmt.<span
              class="req"
              aria-hidden="true"
              >*</span
            >
          </span>
        </label>
        <p class="hint">
          Bei Widersprüchen hat der zuerst genannte Wunsch Vorrang. Ohne Abstimmung kann nur der
          erste Wunsch berücksichtigt werden.
        </p>
      </div>
      <FieldMessages :issues="issuesFor('exception')" />

      <p v-if="canAddExtra" class="add-extra">
        <button type="button" class="btn-link" @click="addExtraWish">
          + Weiteren Wunsch hinzufügen
        </button>
        <span class="hint">nur nach Abstimmung mit dem Präsidium</span>
      </p>
    </template>
  </section>
</template>

<style scoped>
.intro {
  margin: -6px 0 18px;
}

.prev-list {
  margin: 0;
  padding-left: 1.2em;
}

.extra {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px dashed var(--border-strong);
}

.extra-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.extra-head h3 {
  font-size: 1rem;
}

.tag {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--warning-bg);
  color: var(--warning);
  font-size: 0.75rem;
  font-weight: 600;
}

.exception {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--warning-bg);
}

.check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-weight: 600;
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--accent);
}

.add-extra {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin: 20px 0 0;
}

.add-extra .hint {
  margin: 0;
}
</style>

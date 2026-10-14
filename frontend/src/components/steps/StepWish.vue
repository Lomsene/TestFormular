<script setup lang="ts">
import { computed, watch } from 'vue'
import type { AvailabilityForm } from '../../composables/useAvailabilityForm'
import { blockLabel } from '../../domain/config'
import { describeWish } from '../../domain/format'
import { MAX_WISHES_WITH_EXCEPTION } from '../../domain/validation'
import FieldMessages from '../FieldMessages.vue'
import PreviousYearPanel from '../PreviousYearPanel.vue'
import WishEditor from '../WishEditor.vue'

const props = defineProps<{ form: AvailabilityForm }>()
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

const firstKind = computed(() => ft.drafts[0]?.kind ?? null)
const isSame = computed(() => firstKind.value === 'SAME_AS_LAST_YEAR')
const canAddExtra = computed(
  () =>
    firstKind.value !== null &&
    firstKind.value !== 'NONE' &&
    !isSame.value &&
    ft.drafts.length < MAX_WISHES_WITH_EXCEPTION,
)

// „Kein Wunsch“ oder „wie im letzten Jahr“: Zusätzliche Wünsche ergeben keinen Sinn mehr.
watch(firstKind, (kind) => {
  if (kind === 'NONE' || kind === 'SAME_AS_LAST_YEAR') {
    while (ft.drafts.length > 1) removeWish(ft.drafts.length - 1)
  }
})

const previousLabel = computed(() =>
  previousBlockId.value ? blockLabel(previousBlockId.value) : null,
)
const previousWishes = computed(() => previousFullTime.value?.wishes.map(describeWish) ?? [])
</script>

<template>
  <section class="card" aria-labelledby="step-head">
    <h2 id="step-head" class="step-title" tabindex="-1">Ihr Terminwunsch</h2>
    <p class="notice notice-info intro">
      Sie können <strong>einen</strong> Terminwunsch angeben. Er wird berücksichtigt, soweit es die
      Planung zulässt. Ein Anspruch besteht nicht. Ohne Angabe plant die Stundenplanung Sie frei
      nach Bedarf ein.
    </p>

    <div v-for="(draft, i) in ft.drafts" :key="i" class="wish-block" :class="{ extra: i > 0 }">
      <div v-if="i > 0" class="extra-head">
        <h3>Weiterer Wunsch {{ i + 1 }} <span class="tag">Ausnahmefall</span></h3>
        <button type="button" class="btn-link" @click="removeWish(i)">Entfernen</button>
      </div>
      <WishEditor
        :draft="draft"
        :index="i"
        :config="config"
        :issues-for="issuesFor"
        :allow-none="i === 0"
        :previous-label="previousLabel"
      />
    </div>

    <PreviousYearPanel
      v-if="isSame"
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

    <div v-if="ft.drafts.length > 1" class="exception">
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
        Bei Widersprüchen hat der zuerst genannte Wunsch Vorrang. Ohne Abstimmung kann nur der erste
        Wunsch berücksichtigt werden.
      </p>
    </div>
    <FieldMessages :issues="issuesFor('exception')" />

    <p v-if="canAddExtra" class="add-extra">
      <button type="button" class="btn-link" @click="addExtraWish">
        + Weiteren Wunsch hinzufügen
      </button>
      <span class="hint">
        Nur in begründeten Ausnahmefällen und nach Abstimmung mit dem Präsidium.
      </span>
    </p>
  </section>
</template>

<style scoped>
.intro {
  margin: 0 0 16px;
}

.wish-block.extra {
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

.prev-list {
  margin: 0;
  padding-left: 1.2em;
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
  margin: 16px 0 0;
}

.add-extra .hint {
  margin: 0;
}
</style>

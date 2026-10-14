<script setup lang="ts">
import type { AvailabilityForm } from '../../composables/useAvailabilityForm'
import ChoiceGroup from '../ChoiceGroup.vue'
import FieldMessages from '../FieldMessages.vue'

const props = defineProps<{ form: AvailabilityForm }>()
const { state, issuesFor } = props.form
const ft = state.fullTime
</script>

<template>
  <section class="card" aria-labelledby="step-head">
    <h2 id="step-head" class="step-title" tabindex="-1">Ihr Wunsch im letzten Theorieblock</h2>
    <ChoiceGroup
      v-model="ft.wishConsideredLastBlock"
      name="lastBlock"
      legend="Wurde Ihr Terminwunsch im letzten Theorieblock berücksichtigt?"
      :options="[
        { value: 'YES', label: 'Ja' },
        { value: 'NO', label: 'Nein' },
        { value: 'NO_WISH', label: 'Ich hatte keinen Wunsch geäußert' },
      ]"
      :invalid="issuesFor('lastBlock').some((i) => i.severity === 'error')"
    />
    <p class="hint">
      Gemeint ist, ob Ihr damaliger Wunsch erfüllt wurde. Er muss nicht mit dem heutigen Wunsch
      übereinstimmen.
    </p>
    <FieldMessages :issues="issuesFor('lastBlock')" />
    <p v-if="ft.wishConsideredLastBlock === 'NO'" class="notice notice-success claim" role="status">
      Weil Ihr Wunsch zuletzt nicht erfüllt werden konnte, wird er in diesem Theorieblock
      <strong>bevorzugt berücksichtigt</strong>.
    </p>
  </section>
</template>

<style scoped>
.claim {
  margin: 12px 0 0;
}
</style>

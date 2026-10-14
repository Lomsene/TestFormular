<script setup lang="ts">
import type { PlanningConfig } from '../domain/config'
import { exportFileName } from '../domain/export'
import type { AvailabilityExport } from '../domain/types'
import { downloadJson, type SubmitOutcome } from '../services/submit'
import SummaryView from './SummaryView.vue'

defineProps<{ data: AvailabilityExport; outcome: SubmitOutcome; config: PlanningConfig }>()
defineEmits<{ edit: []; restart: [] }>()
</script>

<template>
  <section class="card done" aria-labelledby="done-head">
    <div class="check" aria-hidden="true">✓</div>
    <div>
      <h2 id="done-head" tabindex="-1">Vielen Dank, Ihre Angaben sind eingegangen.</h2>
      <p v-if="outcome.mode === 'SERVER'">
        Ihre Verfügbarkeit wurde an die Stundenplanung übermittelt.
      </p>
      <p v-else>
        Die Datei <strong>{{ outcome.fileName }}</strong> wurde heruntergeladen. Bitte legen Sie sie
        wie gewohnt im DMS ab.
      </p>
    </div>
  </section>

  <SummaryView :data="data" :config="config" />

  <div class="actions">
    <button type="button" class="btn btn-primary" @click="$emit('edit')">Angaben ändern</button>
    <button type="button" class="btn" @click="downloadJson(data, exportFileName(data))">
      Datei erneut herunterladen
    </button>
    <button type="button" class="btn-link" @click="$emit('restart')">
      Neues Formular für eine andere Person
    </button>
  </div>
</template>

<style scoped>
.done {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  border-left: 5px solid var(--st-preferred);
}

.done h2 {
  font-size: 1.25rem;
}

.done h2:focus {
  outline: none;
}

.done p {
  margin: 4px 0 0;
}

.check {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--st-preferred);
  color: #fff;
  font-size: 1.3rem;
  font-weight: 700;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}
</style>

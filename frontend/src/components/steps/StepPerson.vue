<script setup lang="ts">
import { computed } from 'vue'
import { THEORY_BLOCKS } from '../../domain/config'
import { formatDate } from '../../domain/format'
import type { LecturerKind } from '../../domain/types'
import type { AvailabilityForm } from '../../composables/useAvailabilityForm'
import ChoiceGroup, { type Choice } from '../ChoiceGroup.vue'
import FieldMessages from '../FieldMessages.vue'

const props = defineProps<{ form: AvailabilityForm }>()
const { state, issuesFor, block, deadlinePassed, steps } = props.form

const kindOptions: Choice<LecturerKind>[] = [
  {
    value: 'FULL_TIME',
    label: 'Hauptamtlich Lehrende/r',
    description: 'Ich bin hauptamtlich an der DHSH beschäftigt, z. B. als Professor/in.',
  },
  {
    value: 'FREELANCE',
    label: 'Freiberufliche/r Dozierende/r',
    description: 'Ich lehre mit Lehrauftrag bzw. auf Honorarbasis. (vorläufig)',
  },
  {
    value: 'PART_TIME',
    label: 'Teilzeit-Dozierende/r',
    description: 'Ich bin in Teilzeit an der DHSH beschäftigt. (vorläufig)',
  },
]

/** „Danach folgen: …“ – zeigt sofort, wie es je nach Auswahl weitergeht. */
const upcoming = computed(() =>
  steps.value
    .filter((s) => s.id !== 'person' && s.id !== 'review')
    .map((s) => s.label)
    .join(' · '),
)

const invalid = (field: string) => issuesFor(field).some((i) => i.severity === 'error') || undefined
</script>

<template>
  <section class="card" aria-labelledby="step-head">
    <h2 id="step-head" class="step-title" tabindex="-1">Wer sind Sie?</h2>

    <ChoiceGroup
      v-model="state.kind"
      name="kind"
      legend="Was trifft auf Sie zu?"
      variant="cards"
      :options="kindOptions"
      :invalid="issuesFor('kind').some((i) => i.severity === 'error')"
    />
    <FieldMessages :issues="issuesFor('kind')" />
    <p v-if="state.kind" class="notice notice-info upcoming" aria-live="polite">
      Danach fragen wir: <strong>{{ upcoming }}</strong>
    </p>

    <h3 class="sub">Ihre Daten</h3>
    <p class="hint lead">
      Über Ihre E-Mail-Adresse finden wir auch Ihre Angaben aus dem letzten Jahr.
    </p>
    <div class="person-grid">
      <div class="field">
        <label for="lastName">Nachname<span class="req" aria-hidden="true">*</span></label>
        <input
          id="lastName"
          v-model="state.lecturer.lastName"
          class="input"
          autocomplete="family-name"
          required
          :aria-invalid="invalid('lastName')"
        />
        <FieldMessages :issues="issuesFor('lastName')" />
      </div>
      <div class="field">
        <label for="firstName">Vorname<span class="req" aria-hidden="true">*</span></label>
        <input
          id="firstName"
          v-model="state.lecturer.firstName"
          class="input"
          autocomplete="given-name"
          required
          :aria-invalid="invalid('firstName')"
        />
        <FieldMessages :issues="issuesFor('firstName')" />
      </div>
      <div class="field wide">
        <label for="email">
          Dienstliche E-Mail-Adresse<span class="req" aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          v-model="state.lecturer.email"
          class="input"
          type="email"
          autocomplete="email"
          inputmode="email"
          placeholder="name@dhsh.de"
          required
          :aria-invalid="invalid('email')"
        />
        <FieldMessages :issues="issuesFor('email')" />
      </div>
      <div class="field wide">
        <label for="block">Für welchen Theorieblock?</label>
        <select id="block" v-model="state.blockId" class="select">
          <option v-for="b in THEORY_BLOCKS" :key="b.id" :value="b.id">
            {{ b.label }} (Eintragung bis {{ formatDate(b.submissionDeadline) }})
          </option>
        </select>
      </div>
    </div>
    <p v-if="deadlinePassed" class="notice notice-warning deadline" role="status">
      Die Eintragungsfrist für diesen Theorieblock ist am
      {{ formatDate(block.submissionDeadline) }} abgelaufen. Sie können Ihre Angaben trotzdem
      übermitteln, sie werden aber möglicherweise nicht mehr berücksichtigt.
    </p>
  </section>
</template>

<style scoped>
.person-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
}

.wide {
  grid-column: 1 / -1;
}

.upcoming {
  margin: 12px 0 0;
}

.sub {
  margin: 24px 0 2px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 1rem;
  font-weight: 600;
}

.sub + .lead {
  margin: 0 0 14px;
}

.deadline {
  margin: 14px 0 0;
}

@media (max-width: 560px) {
  .person-grid {
    grid-template-columns: 1fr;
  }
}
</style>

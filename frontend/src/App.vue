<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import StepIndicator from './components/StepIndicator.vue'
import SuccessView from './components/SuccessView.vue'
import SummaryView from './components/SummaryView.vue'
import WeekPreview from './components/WeekPreview.vue'
import StepGrid from './components/steps/StepGrid.vue'
import StepLastBlock from './components/steps/StepLastBlock.vue'
import StepPerson from './components/steps/StepPerson.vue'
import StepPresidium from './components/steps/StepPresidium.vue'
import StepWish from './components/steps/StepWish.vue'
import { useAvailabilityForm, type StepId } from './composables/useAvailabilityForm'
import { formatDate } from './domain/format'
import type { AvailabilityExport } from './domain/types'
import { rememberSubmission } from './services/history'
import { submitAvailability, type SubmitOutcome } from './services/submit'

const form = useAvailabilityForm()
const { state, config, result, block, steps, step, stepIndex, preview } = form

/** Wird erhöht, um die Schritte nach „Neues Formular“ frisch aufzubauen. */
const formKey = ref(0)
const submitted = ref<{ data: AvailabilityExport; outcome: SubmitOutcome } | null>(null)
const sending = ref(false)
const sendError = ref<string | null>(null)
const blocked = ref(false)

const isLast = computed(() => step.value.id === 'review')
/** Vorschau neben dem Formular nur dort, wo sie beim Ausfüllen hilft. */
const showAside = computed(
  () => state.kind === 'FULL_TIME' && ['wish', 'lastBlock', 'presidium'].includes(step.value.id),
)

async function focusStep() {
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  document.getElementById('step-head')?.focus({ preventScroll: true })
}

async function showProblems() {
  blocked.value = true
  await nextTick()
  document
    .querySelector('.messages .error')
    ?.closest('.card')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function next() {
  if (form.next()) {
    blocked.value = false
    focusStep()
  } else {
    showProblems()
  }
}

function back() {
  blocked.value = false
  form.back()
  focusStep()
}

function goTo(index: number) {
  blocked.value = false
  if (!form.goTo(index)) blocked.value = true
  focusStep()
}

function editFromReview(id: StepId) {
  const index = steps.value.findIndex((s) => s.id === id)
  if (index >= 0) goTo(index)
}

async function submit() {
  sendError.value = null
  const data = form.buildSubmission()
  if (!data) {
    showProblems()
    return
  }
  sending.value = true
  try {
    const outcome = await submitAvailability(data)
    rememberSubmission(data)
    submitted.value = { data, outcome }
    blocked.value = false
    window.scrollTo({ top: 0 })
    await nextTick()
    document.getElementById('done-head')?.focus()
  } catch (e) {
    sendError.value = e instanceof Error ? e.message : 'Unbekannter Fehler beim Senden.'
  } finally {
    sending.value = false
  }
}

function edit() {
  submitted.value = null
}

function restart() {
  form.reset()
  formKey.value++
  submitted.value = null
  window.scrollTo({ top: 0 })
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <img src="/dhsh-logo.png" alt="Duale Hochschule Schleswig-Holstein" class="logo" />
      <div class="app-title">
        <span class="app-name">Stundenplanung</span>
        <span class="app-sub">Verfügbarkeiten der Dozierenden</span>
      </div>
    </div>
    <div class="brandline" />
  </header>

  <main class="page">
    <SuccessView
      v-if="submitted"
      :data="submitted.data"
      :outcome="submitted.outcome"
      :config="config"
      @edit="edit"
      @restart="restart"
    />

    <template v-else>
      <div class="intro">
        <h1>Wann können Sie lehren?</h1>
        <p>
          {{ block.label }} · Eintragung bis
          <strong>{{ formatDate(block.submissionDeadline) }}</strong
          >. Ihre Eingaben werden in diesem Browser zwischengespeichert.
        </p>
      </div>

      <div :key="formKey">
        <StepIndicator
          :steps="steps"
          :current="stepIndex"
          :is-complete="form.stepComplete"
          @go="goTo"
        />

        <div class="layout" :class="{ 'with-aside': showAside }">
          <form class="form" novalidate @submit.prevent="isLast ? submit() : next()">
            <StepPerson v-if="step.id === 'person'" :form="form" />
            <StepWish v-else-if="step.id === 'wish'" :form="form" />
            <StepLastBlock v-else-if="step.id === 'lastBlock'" :form="form" />
            <StepPresidium v-else-if="step.id === 'presidium'" :form="form" />
            <StepGrid
              v-else-if="
                step.id === 'grid' && (state.kind === 'FREELANCE' || state.kind === 'PART_TIME')
              "
              :key="state.kind"
              :form="form"
              :kind="state.kind"
            />
            <template v-else-if="step.id === 'review'">
              <h2 id="step-head" class="step-title review-title" tabindex="-1">
                Bitte prüfen Sie Ihre Angaben
              </h2>
              <SummaryView :data="preview" :config="config" editable @edit="editFromReview" />
            </template>

            <div class="nav">
              <p v-if="blocked" class="notice notice-error" role="alert">
                Bitte ergänzen Sie die rot markierten Angaben, bevor es weitergeht.
              </p>
              <p v-if="sendError" class="notice notice-error" role="alert">{{ sendError }}</p>
              <div class="nav-buttons">
                <button v-if="stepIndex > 0" type="button" class="btn" @click="back">
                  ← Zurück
                </button>
                <button type="submit" class="btn btn-primary btn-lg" :disabled="sending">
                  <template v-if="!isLast">Weiter →</template>
                  <template v-else>{{
                    sending ? 'Wird gesendet …' : 'Verfügbarkeit absenden'
                  }}</template>
                </button>
              </div>
            </div>
          </form>

          <aside v-if="showAside" class="aside" aria-labelledby="preview-head">
            <div class="card">
              <h2 id="preview-head" class="aside-title">Vorschau Ihrer Woche</h2>
              <p class="hint">Aktualisiert sich, während Sie ausfüllen.</p>
              <div class="aside-preview">
                <WeekPreview :result="result" :config="config" compact />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.topbar {
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
}

.topbar-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 10px 16px;
}

.logo {
  height: 34px;
  width: auto;
}

.app-title {
  display: flex;
  flex-direction: column;
  padding-left: 20px;
  border-left: 1px solid var(--border);
  line-height: 1.2;
}

.app-name {
  font-weight: 700;
}

.app-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.brandline {
  height: 3px;
  background: var(--brand-gradient);
}

.page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}

.intro h1 {
  font-size: 1.6rem;
  font-weight: 700;
}

.intro p {
  margin: 6px 0 20px;
  color: var(--text-muted);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 860px);
  justify-content: center;
  gap: 20px;
  align-items: start;
}

.layout.with-aside {
  grid-template-columns: minmax(0, 1fr) 380px;
  justify-content: stretch;
}

.form {
  min-width: 0;
}

.review-title {
  margin-bottom: 14px;
}

.aside {
  position: sticky;
  top: 84px;
}

.aside-title {
  font-size: 1rem;
  font-weight: 600;
}

.aside-preview {
  margin-top: 12px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.nav .notice {
  margin: 0;
}

.nav-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.nav-buttons .btn-primary {
  margin-left: auto;
}

.btn-lg {
  min-height: 48px;
  padding: 10px 28px;
  font-size: 1.05rem;
}

.btn-lg:disabled {
  opacity: 0.6;
  cursor: wait;
}

@media (max-width: 980px) {
  .layout.with-aside {
    grid-template-columns: minmax(0, 1fr);
  }

  .aside {
    position: static;
  }
}

@media (max-width: 560px) {
  .app-title {
    display: none;
  }

  .intro h1 {
    font-size: 1.35rem;
  }
}
</style>

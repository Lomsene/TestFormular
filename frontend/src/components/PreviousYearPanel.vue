<script setup lang="ts">
import { blockLabel } from '../domain/config'

/**
 * Anzeige für „wie im letzten Jahr“: entweder die gefundenen Vorjahresangaben (Slot) mit
 * der Möglichkeit, sie als Vorlage zu übernehmen – oder der Hinweis, dass die Stundenplanung
 * die Angaben aus dem Vorjahr selbst übernimmt.
 */
defineProps<{
  previousBlockId: string | null
  found: boolean
  email: string
}>()
defineEmits<{ adopt: [] }>()
</script>

<template>
  <div class="panel">
    <template v-if="!previousBlockId">
      <p class="notice notice-warning">
        Für diesen Theorieblock gibt es keinen entsprechenden Block im letzten Jahr. Bitte machen
        Sie Ihre Angaben neu.
      </p>
    </template>
    <template v-else-if="found">
      <p class="title">Ihre Angaben aus dem {{ blockLabel(previousBlockId) }}:</p>
      <div class="content"><slot /></div>
      <p class="actions">
        <span class="hint">Diese Angaben werden unverändert übernommen.</span>
        <button type="button" class="btn-link" @click="$emit('adopt')">
          Als Vorlage übernehmen und anpassen
        </button>
      </p>
    </template>
    <template v-else>
      <p class="notice notice-info">
        Ihre Angaben aus dem <strong>{{ blockLabel(previousBlockId) }}</strong> werden übernommen.
        Sie liegen diesem Formular{{ email ? ` für ${email}` : '' }} nicht vor, deshalb ergänzt die
        Stundenplanung sie.
      </p>
    </template>
  </div>
</template>

<style scoped>
.panel {
  margin-top: 16px;
}

.panel .notice {
  margin: 0;
}

.title {
  margin: 0 0 8px;
  font-weight: 600;
}

.content {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px 12px;
  margin: 10px 0 0;
}

.actions .hint {
  margin: 0;
}
</style>

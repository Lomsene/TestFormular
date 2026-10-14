<script setup lang="ts">
import type { Issue } from '../domain/validation'

defineProps<{ issues: Issue[]; id?: string }>()
</script>

<template>
  <ul v-if="issues.length" :id="id" class="messages" aria-live="polite">
    <li v-for="(issue, i) in issues" :key="i" :class="issue.severity">
      <span aria-hidden="true">{{ issue.severity === 'error' ? '✕' : '!' }}</span>
      {{ issue.message }}
    </li>
  </ul>
</template>

<style scoped>
.messages {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.88rem;
}

li {
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
}

li > span {
  font-weight: 700;
  flex: none;
}

.error {
  color: var(--error);
  background: var(--error-bg);
}

.warning {
  color: var(--warning);
  background: var(--warning-bg);
}
</style>

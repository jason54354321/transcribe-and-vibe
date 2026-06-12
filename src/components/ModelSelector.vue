<script setup lang="ts">
import { computed } from 'vue'

type ModelOption = {
  id: string
  label: string
  description?: string
  vram_mb?: number
}

const props = defineProps<{
  modelId: string
  disabled?: boolean
  models: ModelOption[]
}>()

const emit = defineEmits<{
  'update:modelId': [value: string]
}>()

const modelEntries = computed(() => props.models || [])

const formatVram = (vramMb?: number) => {
  if (!vramMb || vramMb <= 0) return ''
  if (vramMb < 1024) return `(~${vramMb}MB)`

  const vramGb = vramMb / 1024
  const rounded = Number.isInteger(vramGb) ? String(vramGb) : vramGb.toFixed(1)
  return `(~${rounded}GB)`
}
</script>

<template>
  <div id="model-selector" class="model-selector">
    <div class="selector-group">
      <label for="model-select">Model</label>
      <select
        id="model-select"
        :value="modelId"
        :disabled="disabled"
        @change="emit('update:modelId', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="m in modelEntries" :key="m.id" :value="m.id">
          {{ m.label }} {{ formatVram(m.vram_mb) }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.model-selector {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
}

.selector-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 5px 6px 5px 14px;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.18s ease;
}

.selector-group:focus-within {
  border-color: var(--accent-color);
}

.selector-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--secondary-text);
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.selector-group select {
  font-size: 13px;
  font-weight: 550;
  font-family: var(--font-stack);
  padding: 5px 30px 5px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  background-color: var(--button-bg);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%236b6b6b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 4.5 6 7.5 9 4.5'/></svg>");
  background-repeat: no-repeat;
  background-position: right 11px center;
  background-size: 11px;
  color: var(--text-color);
  cursor: pointer;
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease;
}

[data-theme='dark'] .selector-group select {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%239b958c' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 4.5 6 7.5 9 4.5'/></svg>");
}

.selector-group select:hover:not(:disabled) {
  border-color: var(--accent-soft-border);
  background-color: var(--button-hover-bg);
}

.selector-group select:focus-visible {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.selector-group select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .model-selector {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
}
</style>

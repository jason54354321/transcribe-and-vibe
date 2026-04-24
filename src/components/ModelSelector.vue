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
  margin-top: 10px;
}

.selector-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.selector-group label {
  font-size: 12px;
  color: var(--secondary-text);
  white-space: nowrap;
}

.selector-group select {
  font-size: 13px;
  font-family: var(--font-stack);
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--button-bg);
  color: var(--text-color);
  cursor: pointer;
  outline: none;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.selector-group select:hover:not(:disabled) {
  border-color: var(--accent-color);
  background: var(--button-hover-bg);
}

.selector-group select:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-light);
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

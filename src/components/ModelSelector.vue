<script setup lang="ts">
import { computed, watch } from 'vue'
import { MODELS } from '../models'

const props = defineProps<{
  modelId: string
  dtype: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelId': [value: string]
  'update:dtype': [value: string]
}>()

const modelEntries = computed(() =>
  Object.entries(MODELS).map(([id, cfg]) => ({ id, label: cfg.label })),
)

const currentDtypes = computed(() => {
  const cfg = MODELS[props.modelId]
  if (!cfg) return []
  return Object.entries(cfg.dtypes).map(([key, info]) => ({
    key,
    label: info.label,
    size: info.size,
  }))
})

function formatSize(mb: number): string {
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`
  return `${mb} MB`
}

// When model changes, reset dtype to q8 (always available) if current dtype isn't valid
watch(
  () => props.modelId,
  (newModelId) => {
    const cfg = MODELS[newModelId]
    if (cfg && !(props.dtype in cfg.dtypes)) {
      emit('update:dtype', 'q8')
    }
  },
)
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
          {{ m.label }}
        </option>
      </select>
    </div>
    <div class="selector-group">
      <label for="dtype-select">Precision</label>
      <select
        id="dtype-select"
        :value="dtype"
        :disabled="disabled"
        @change="emit('update:dtype', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="d in currentDtypes" :key="d.key" :value="d.key">
          {{ d.label }} ({{ formatSize(d.size) }})
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
  background: var(--bg-color);
  color: var(--text-color);
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.selector-group select:hover:not(:disabled) {
  border-color: var(--accent-color);
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

<script setup lang="ts">
import ModelSelector from './ModelSelector.vue'

type ModelOption = {
  id: string
  label: string
  description?: string
  vram_mb?: number
}

const props = defineProps<{
  modelId: string
  useVad: boolean
  isDarkTheme: boolean
  isProcessing: boolean
  visibleModelOptions: ModelOption[]
  isHighlightEnabled: boolean
}>()

const emit = defineEmits<{
  'update:modelId': [value: string]
  'update:useVad': [value: boolean]
  'update:isHighlightEnabled': [value: boolean]
  toggleTheme: []
}>()
</script>

<template>
  <header>
    <h1>Vibe Transcription</h1>
    <div class="subtitle">Local, private audio transcription</div>
    <ModelSelector
      :model-id="props.modelId"
      :models="props.visibleModelOptions"
      :disabled="props.isProcessing"
      @update:model-id="emit('update:modelId', $event)"
    />
    <div class="option-toggles">
      <label class="toggle-label">
        <input
          id="vad-toggle"
          type="checkbox"
          :checked="props.useVad"
          :disabled="props.isProcessing"
          @change="emit('update:useVad', ($event.target as HTMLInputElement).checked)"
        />
        <span>VAD preprocessing</span>
      </label>
      <label class="toggle-label">
        <input
          id="theme-toggle"
          type="checkbox"
          :checked="props.isDarkTheme"
          @change="emit('toggleTheme')"
        />
        <span>Dark mode</span>
      </label>
      <label class="toggle-label">
        <input
          id="highlight-toggle"
          type="checkbox"
          :checked="props.isHighlightEnabled"
          @change="emit('update:isHighlightEnabled', ($event.target as HTMLInputElement).checked)"
        />
        <span>Word highlight</span>
      </label>
    </div>
  </header>
</template>

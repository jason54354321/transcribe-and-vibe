<script setup lang="ts">
import ModelSelector from './ModelSelector.vue'
import type { BackendInfo } from '../composables/useBackendTranscriber'
import type { ModelOption } from '../utils/modelMode'

const props = defineProps<{
  modelId: string
  dtype: string
  useBackend: boolean
  useVad: boolean
  isDarkTheme: boolean
  isProcessing: boolean
  canUseBackend: boolean
  visibleModelOptions: ModelOption[]
  showPrecisionSelector: boolean
  backendInfo: BackendInfo | null
  isHighlightEnabled: boolean
}>()

const emit = defineEmits<{
  'update:modelId': [value: string]
  'update:dtype': [value: string]
  'update:useBackend': [value: boolean]
  'update:useVad': [value: boolean]
  'update:isHighlightEnabled': [value: boolean]
  'toggleTheme': []
}>()
</script>

<template>
  <header>
    <h1>Vibe Transcription</h1>
    <div class="subtitle">Local, private audio transcription</div>
    <ModelSelector
      :model-id="props.modelId"
      :dtype="props.dtype"
      :models="props.visibleModelOptions"
      :show-dtype="props.showPrecisionSelector"
      :disabled="props.isProcessing"
      @update:model-id="emit('update:modelId', $event)"
      @update:dtype="emit('update:dtype', $event)"
    />
    <div class="option-toggles">
      <label class="toggle-label">
        <input
          id="backend-toggle"
          type="checkbox"
          :checked="props.useBackend"
          :disabled="props.isProcessing || !props.canUseBackend"
          @change="emit('update:useBackend', ($event.target as HTMLInputElement).checked)"
        />
        <span>GPU backend{{ props.backendInfo ? ` (${props.backendInfo.device})` : '' }}</span>
      </label>
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

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import DropZone from './components/DropZone.vue'
import StatusBar from './components/StatusBar.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import TranscriptView from './components/TranscriptView.vue'
import SessionList from './components/SessionList.vue'
import TranscriptionControls from './components/TranscriptionControls.vue'
import type { TranscribeResult } from './types/transcriber'
import { useFileUpload } from './composables/useFileUpload'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { VALID_TYPES, MAX_FILE_SIZE } from './composables/useFileUpload'
import { useTheme } from './composables/useTheme'
import { useStickyAudio } from './composables/useStickyAudio'
import { useSessionOrchestration } from './composables/useSessionOrchestration'
import { useBackendTranscriber } from './composables/useBackendTranscriber'
import { createLogger } from './utils/logger'
import { formatTranscriptionTimeDisplay } from './utils/sessionOrchestration'
import type { ModelInfo } from './types/transcriber'

const log = createLogger('App')

const backendTranscriber = useBackendTranscriber()
const {
  status,
  result: transcriberResult,
  error: transcriberError,
  isProcessing,
  modelInfo,
  downloadProgress,
  transcriptionTimeSec,
  transcriptionProgress,
  resetError,
  checkBackend,
} = backendTranscriber

const selectedModel = ref('base')
const useVad = ref(true)
const backendChecked = ref(false)
const backendAvailable = ref(false)

const visibleModelOptions = computed(
  () => backendTranscriber.backendInfo.value?.available_models ?? [],
)

const { handleFile } = useFileUpload()
const { currentTheme, toggleTheme, initializeTheme } = useTheme()
const { audioUrl, isAudioStuck, hasAudioSource, revokeAudioUrl } = useStickyAudio()
const isHighlightEnabled = ref(true)

const initializeHighlight = () => {
  const saved = localStorage.getItem('vibe-highlight')
  if (saved !== null) {
    isHighlightEnabled.value = saved === 'true'
  }
}

watch(isHighlightEnabled, (enabled) => {
  localStorage.setItem('vibe-highlight', String(enabled))
})

const displayedResult = ref<TranscribeResult | null>(null)
const sessionOrchestration = useSessionOrchestration({
  transcriberResult,
  transcriberError,
  displayedResult,
  isProcessing,
  transcriptionTimeSec,
  audioUrl,
  revokeAudioUrl,
})
const {
  sessions,
  activeSessionId,
  displayTranscriptionTime,
  showStatus,
  initializeSessions,
  startTranscriptionSession,
  setCurrentAudio,
  addTemporarySession,
  handleTranscriptionStartFailure,
  onSessionSelect,
  onSessionDelete,
  onNewSession,
} = sessionOrchestration

const audioPlayerRef = ref<InstanceType<typeof AudioPlayer> | null>(null)
const appError = ref<string | null>(null)

useKeyboardShortcuts(
  {
    togglePlay: () => audioPlayerRef.value?.togglePlay(),
    skip: (d) => audioPlayerRef.value?.skip(d),
    adjustVolume: (d) => audioPlayerRef.value?.adjustVolume(d),
  },
  hasAudioSource,
)

const showDropZone = computed(() => !isProcessing.value && !displayedResult.value)
const showTranscript = computed(() => displayedResult.value !== null)
const displayError = computed(() => transcriberError.value || appError.value)
const runtimeModelInfo = computed<ModelInfo | null>(() => {
  const backendRuntime = backendTranscriber.backendInfo.value
  const activeResult = displayedResult.value

  if (modelInfo.value || activeResult?.model) {
    return {
      hardware: modelInfo.value?.hardware ?? activeResult?.hardware ?? backendRuntime?.hardware,
      model: modelInfo.value?.model ?? activeResult?.model ?? selectedModel.value,
      dtype: modelInfo.value?.dtype ?? activeResult?.dtype,
      engine: modelInfo.value?.engine ?? activeResult?.engine ?? backendRuntime?.engine,
      executionBackend:
        modelInfo.value?.executionBackend ??
        activeResult?.execution_backend ??
        backendRuntime?.execution_backend,
    }
  }

  return null
})
const statusBarVisible = computed(() => showStatus.value || runtimeModelInfo.value !== null)
const statusDisplay = computed(() => {
  if (isProcessing.value) return status.value
  if (runtimeModelInfo.value) return 'Transcription complete'
  return status.value
})

const clearAppError = () => {
  appError.value = null
}

const transcriptionTimeDisplay = computed(() =>
  formatTranscriptionTimeDisplay(displayTranscriptionTime.value),
)

const onFileSelected = async (file: File) => {
  appError.value = null
  resetError()
  displayedResult.value = null

  if (!VALID_TYPES.includes(file.type) && !file.type.startsWith('audio/')) {
    appError.value = `Invalid file type: ${file.type}. Please upload audio.`
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    appError.value = 'File too large. Maximum size is 100MB.'
    return
  }
  if (!backendAvailable.value) {
    appError.value =
      'Backend is unreachable. Start the backend service, then try transcription again.'
    return
  }

  const sessionId = crypto.randomUUID()
  startTranscriptionSession(sessionId, file.name)
  isProcessing.value = true
  status.value = 'Reading file...'

  try {
    revokeAudioUrl()
    const { audioUrl: url, audioBlob: blob, durationSec: dur } = await handleFile(file)
    setCurrentAudio(url, blob, dur)
    addTemporarySession(sessionId, file.name, dur)

    log.info(
      `New transcription started (session: ${sessionId}, file: ${file.name}, VAD=${useVad.value})`,
    )
    await backendTranscriber.transcribe(file, selectedModel.value, useVad.value)
  } catch (err: unknown) {
    appError.value = err instanceof Error ? err.message : String(err)
    isProcessing.value = false
    log.error('File processing failed', err)
    handleTranscriptionStartFailure(sessionId)
  }
}

const onSeek = (ms: number) => {
  audioPlayerRef.value?.seekTo(ms)
}

onMounted(async () => {
  initializeTheme()
  initializeHighlight()

  try {
    await initializeSessions()
  } catch (err: unknown) {
    log.error('Failed to load sessions', err)
  }

  const detected = await checkBackend()
  backendChecked.value = true
  backendAvailable.value = detected
  if (detected) {
    log.info('Backend detected, using backend transcription')
    selectedModel.value = backendTranscriber.backendInfo.value?.default_model || 'base'
  }
})
</script>

<template>
  <div class="app-layout">
    <SessionList
      :sessions="sessions"
      :active-session-id="activeSessionId"
      @select="onSessionSelect($event, clearAppError)"
      @delete="onSessionDelete($event, clearAppError)"
      @new-session="onNewSession(clearAppError)"
    />
    <main class="main-content">
      <div class="container">
        <TranscriptionControls
          :model-id="selectedModel"
          :use-vad="useVad"
          :is-dark-theme="currentTheme === 'dark'"
          :is-processing="isProcessing"
          :visible-model-options="visibleModelOptions"
          :is-highlight-enabled="isHighlightEnabled"
          @update:model-id="selectedModel = $event"
          @update:use-vad="useVad = $event"
          @update:is-highlight-enabled="isHighlightEnabled = $event"
          @toggle-theme="toggleTheme"
        />

        <div v-if="backendChecked && !backendAvailable" id="backend-warning" class="warning-banner">
          Backend is unreachable. Audio transcription requires the backend service to be running.
        </div>

        <div v-show="displayError" id="error-container" class="error-container">
          {{ displayError }}
        </div>

        <DropZone v-show="showDropZone" @file-selected="onFileSelected" />

        <StatusBar
          v-show="statusBarVisible"
          :status="statusDisplay"
          :model-info="runtimeModelInfo"
          :download-progress="downloadProgress"
          :transcription-progress="transcriptionProgress"
        />

        <AudioPlayer
          v-show="audioUrl"
          :src="audioUrl"
          ref="audioPlayerRef"
          :class="{ stuck: isAudioStuck }"
        />

        <div
          v-show="displayedResult && displayTranscriptionTime != null"
          class="transcription-meta"
        >
          Transcribed in {{ transcriptionTimeDisplay }}
        </div>

        <TranscriptView
          v-show="showTranscript && displayedResult"
          :chunks="displayedResult?.chunks || []"
          :currentTimeMs="audioPlayerRef?.currentTimeMs || 0"
          :is-highlight-enabled="isHighlightEnabled"
          @seek="onSeek"
        />
      </div>
    </main>

    <Transition name="hints-fade">
      <div v-show="hasAudioSource" class="keyboard-hints" id="keyboard-hints">
        <kbd>Space</kbd> play/pause
        <span class="hint-sep">·</span>
        <kbd>←</kbd><kbd>→</kbd> ±5s
        <span class="hint-sep">·</span>
        <kbd>↑</kbd><kbd>↓</kbd> volume
      </div>
    </Transition>
  </div>
</template>

<style>
:root {
  --font-stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --bg-color: #ffffff;
  --panel-bg: #f5f5f5;
  --button-bg: #f5f5f5;
  --button-hover-bg: #ebebeb;
  --text-color: #1a1a1a;
  --accent-color: #0b6fcc;
  --accent-light: #e6f0fa;
  --accent-soft: #d8e8f6;
  --accent-soft-border: #b7d1ea;
  --border-color: #e5e5e5;
  --divider-color: #d9d9d9;
  --secondary-text: #666666;
  --error-color: #d93025;
  --error-bg: #fce8e6;
  --warning-color: #8a6d00;
  --warning-bg: #fef7e0;
  --success-color: #188038;
  --radius: 8px;
  --spacing-unit: 16px;
  --hover-bg: #f0f0f0;
  --sticky-bg: rgba(255, 255, 255, 0.95);
}

[data-theme='dark'] {
  color-scheme: dark;
  --bg-color: #181a1b;
  --panel-bg: #1e2021;
  --button-bg: #2b2f31;
  --button-hover-bg: #32373a;
  --text-color: #d8d4cf;
  --accent-color: #0b6fcc;
  --accent-light: #1f425e;
  --accent-soft: #1f3447;
  --accent-soft-border: #34506b;
  --border-color: #545b5e;
  --divider-color: #3a3f42;
  --secondary-text: #b2aba1;
  --error-color: #ff7b72;
  --error-bg: #3a1d1d;
  --warning-color: #e0b15a;
  --warning-bg: #3a2f1b;
  --success-color: #7ccf8a;
  --hover-bg: #232628;
  --sticky-bg: rgba(24, 26, 27, 0.95);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-stack);
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  min-width: 0;
  padding: calc(var(--spacing-unit) * 2);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 100px;
}

header {
  margin-bottom: calc(var(--spacing-unit) * 3);
  text-align: center;
}

h1 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.subtitle {
  color: var(--secondary-text);
  font-size: 14px;
}

.warning-banner {
  background-color: var(--warning-bg);
  color: var(--warning-color);
  padding: var(--spacing-unit);
  border-radius: var(--radius);
  margin-bottom: var(--spacing-unit);
  text-align: center;
  font-size: 14px;
}

.error-container {
  background-color: var(--error-bg);
  color: var(--error-color);
  padding: var(--spacing-unit);
  border-radius: var(--radius);
  margin-bottom: var(--spacing-unit);
  text-align: center;
  font-size: 14px;
}

.transcription-meta {
  color: var(--secondary-text);
  font-size: 13px;
  margin-bottom: calc(var(--spacing-unit) / 2);
}

.option-toggles {
  display: flex;
  justify-content: center;
  gap: calc(var(--spacing-unit) * 1.5);
  margin-top: 8px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--secondary-text);
  cursor: pointer;
}

.toggle-label input[type='checkbox'] {
  cursor: pointer;
  accent-color: var(--accent-color);
}

.toggle-label input[type='checkbox']:disabled {
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .main-content {
    padding: var(--spacing-unit);
  }

  h1 {
    font-size: 20px;
  }

  .keyboard-hints {
    display: none;
  }
}

.keyboard-hints {
  position: fixed;
  bottom: calc(var(--spacing-unit) * 0.75);
  right: calc(var(--spacing-unit) * 0.75);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 11px;
  color: var(--secondary-text);
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  opacity: 0.7;
  pointer-events: none;
  z-index: 100;
}

.keyboard-hints kbd {
  display: inline-block;
  padding: 1px 5px;
  font-family: inherit;
  font-size: 10px;
  line-height: 1.4;
  color: var(--text-color);
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: 3px;
}

.keyboard-hints .hint-sep {
  color: var(--border-color);
}

.hints-fade-enter-active,
.hints-fade-leave-active {
  transition: opacity 0.3s ease;
}

.hints-fade-enter-from,
.hints-fade-leave-to {
  opacity: 0;
}
</style>

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
import { useEnglishLearningMode } from './composables/useEnglishLearningMode'
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
const backendChecked = ref(false)
const backendAvailable = ref(false)

const visibleModelOptions = computed(
  () => backendTranscriber.backendInfo.value?.available_models ?? [],
)

const { handleFile } = useFileUpload()
const { currentTheme, toggleTheme, initializeTheme } = useTheme()
const { audioUrl, isAudioStuck, hasAudioSource, revokeAudioUrl } = useStickyAudio()
const isHighlightEnabled = ref(true)
const isLearningEnabled = ref(false)

const initializeHighlight = () => {
  const saved = localStorage.getItem('vibe-highlight')
  if (saved !== null) {
    isHighlightEnabled.value = saved === 'true'
  }
}

const initializeLearning = () => {
  const saved = localStorage.getItem('vibe-learning')
  if (saved !== null) {
    isLearningEnabled.value = saved === 'true'
  }
}

watch(isHighlightEnabled, (enabled) => {
  localStorage.setItem('vibe-highlight', String(enabled))
})

watch(isLearningEnabled, (enabled) => {
  localStorage.setItem('vibe-learning', String(enabled))
})

const displayedResult = ref<TranscribeResult | null>(null)
const showBenchmarkRawTranscript = import.meta.env.VITE_BENCHMARK_RAW_TRANSCRIPT === '1'
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

const learning = useEnglishLearningMode({
  chunks: computed(() => displayedResult.value?.chunks ?? []),
  currentTimeMs: computed(() => audioPlayerRef.value?.currentTimeMs ?? 0),
  isPlaying: computed(() => audioPlayerRef.value?.isPlaying ?? false),
  isEnabled: isLearningEnabled,
  seekTo: (ms) => audioPlayerRef.value?.seekTo(ms),
  pause: () => audioPlayerRef.value?.pause(),
})

const activeSentenceRange = computed(() => {
  const index = learning.currentSentenceIndex.value
  if (index < 0) return null
  const sentence = learning.sentences.value[index]
  if (!sentence) return null
  return { startWordIndex: sentence.startWordIndex, endWordIndex: sentence.endWordIndex }
})

useKeyboardShortcuts(
  {
    togglePlay: () => audioPlayerRef.value?.togglePlay(),
    skip: (d) => audioPlayerRef.value?.skip(d),
    adjustVolume: (d) => audioPlayerRef.value?.adjustVolume(d),
    prevSentence: () => learning.prevSentence(),
    nextSentence: () => learning.nextSentence(),
    replaySentence: () => learning.replaySentence(),
  },
  hasAudioSource,
  isLearningEnabled,
)

const showDropZone = computed(() => !isProcessing.value && !displayedResult.value)
const showTranscript = computed(() => displayedResult.value !== null)
const displayError = computed(() => transcriberError.value || appError.value)

const buildViewedSessionModelInfo = (result: TranscribeResult): ModelInfo => ({
  hardware: result.hardware,
  model: result.model ?? 'N/A',
  dtype: result.dtype,
  engine: result.engine,
  executionBackend: result.execution_backend,
})

const runtimeModelInfo = computed<ModelInfo | null>(() => {
  if (showStatus.value) {
    return modelInfo.value
  }

  if (displayedResult.value) {
    return buildViewedSessionModelInfo(displayedResult.value)
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

    log.info(`New transcription started (session: ${sessionId}, file: ${file.name})`)
    await backendTranscriber.transcribe(file, selectedModel.value)
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
  initializeLearning()

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
          :is-dark-theme="currentTheme === 'dark'"
          :is-processing="isProcessing"
          :visible-model-options="visibleModelOptions"
          :is-highlight-enabled="isHighlightEnabled"
          :is-learning-enabled="isLearningEnabled"
          @update:model-id="selectedModel = $event"
          @update:is-highlight-enabled="isHighlightEnabled = $event"
          @update:is-learning-enabled="isLearningEnabled = $event"
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

        <div
          v-if="showBenchmarkRawTranscript"
          id="benchmark-raw-transcript"
          hidden
          aria-hidden="true"
        >
          {{ displayedResult?.text ?? '' }}
        </div>

        <TranscriptView
          v-show="showTranscript && displayedResult"
          :chunks="displayedResult?.chunks || []"
          :currentTimeMs="audioPlayerRef?.currentTimeMs || 0"
          :is-highlight-enabled="isHighlightEnabled"
          :is-playing="audioPlayerRef?.isPlaying || false"
          :is-learning-enabled="isLearningEnabled"
          :active-sentence-range="activeSentenceRange"
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
        <template v-if="isLearningEnabled">
          <span class="hint-sep">·</span>
          <kbd>A</kbd><kbd>D</kbd> prev/next sentence
          <span class="hint-sep">·</span>
          <kbd>S</kbd> replay
        </template>
      </div>
    </Transition>
  </div>
</template>

<style>
:root {
  --font-stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

  /* Surface layering */
  --bg-color: #fbfbfa;
  --panel-bg: #ffffff;
  --panel-raised: #ffffff;
  --button-bg: #f4f4f2;
  --button-hover-bg: #ebebe8;
  --text-color: #19191a;
  --hover-bg: #f1f1ef;

  /* Accent (indigo) */
  --accent-color: #4f46e5;
  --accent-strong: #4338ca;
  --accent-light: #eef0fe;
  --accent-soft: #e0e3fc;
  --accent-soft-border: #c3c8fa;
  --accent-contrast: #ffffff;

  /* Lines */
  --border-color: #e7e7e3;
  --divider-color: #ececea;
  --secondary-text: #6b6b6b;

  /* Semantic */
  --error-color: #c2342a;
  --error-bg: #fcecea;
  --error-border: #f3c9c4;
  --warning-color: #8a6300;
  --warning-bg: #fdf3df;
  --warning-border: #f0dca8;
  --success-color: #15803d;

  /* Scales */
  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 14px;
  --radius-pill: 999px;
  --spacing-unit: 16px;

  --shadow-sm: 0 1px 2px rgba(17, 17, 19, 0.05), 0 1px 1px rgba(17, 17, 19, 0.04);
  --shadow-md: 0 4px 16px rgba(17, 17, 19, 0.08), 0 1px 3px rgba(17, 17, 19, 0.05);

  --sticky-bg: rgba(251, 251, 250, 0.82);
}

[data-theme='dark'] {
  color-scheme: dark;

  --bg-color: #161819;
  --panel-bg: #1d2021;
  --panel-raised: #24282a;
  --button-bg: #2b2f31;
  --button-hover-bg: #353a3d;
  --text-color: #d8d4cf;
  --hover-bg: #26292b;

  --accent-color: #7c8cff;
  --accent-strong: #93a0ff;
  --accent-light: #232843;
  --accent-soft: #2b3154;
  --accent-soft-border: #3c4574;
  --accent-contrast: #11131f;

  --border-color: #353a3d;
  --divider-color: #2c3032;
  --secondary-text: #9b958c;

  --error-color: #ff8b82;
  --error-bg: #371f1e;
  --error-border: #5a3330;
  --warning-color: #e6b865;
  --warning-bg: #34291a;
  --warning-border: #574629;
  --success-color: #7ccf8a;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 6px 22px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.4);

  --sticky-bg: rgba(22, 24, 25, 0.78);
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
  text-rendering: optimizeLegibility;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  min-width: 0;
  padding: calc(var(--spacing-unit) * 2.5) calc(var(--spacing-unit) * 2);
}

.container {
  max-width: 760px;
  margin: 0 auto;
  padding-bottom: 120px;
}

header {
  margin-bottom: calc(var(--spacing-unit) * 2.5);
  text-align: center;
}

h1 {
  font-size: 26px;
  font-weight: 650;
  margin-bottom: 6px;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.subtitle {
  color: var(--secondary-text);
  font-size: 14px;
  letter-spacing: 0.01em;
}

.warning-banner,
.error-container {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  margin-bottom: var(--spacing-unit);
  text-align: left;
  font-size: 13.5px;
  line-height: 1.5;
  box-shadow: var(--shadow-sm);
}

.warning-banner {
  background-color: var(--warning-bg);
  color: var(--warning-color);
  border-color: var(--warning-border);
}

.error-container {
  background-color: var(--error-bg);
  color: var(--error-color);
  border-color: var(--error-border);
}

.warning-banner::before,
.error-container::before {
  flex: none;
  font-size: 14px;
  line-height: 1.45;
}

.warning-banner::before {
  content: '⚠';
}

.error-container::before {
  content: '⊘';
}

.transcription-meta {
  color: var(--secondary-text);
  font-size: 13px;
  margin-bottom: calc(var(--spacing-unit) / 2);
  font-variant-numeric: tabular-nums;
}

.option-toggles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 20px;
  margin-top: 14px;
}

.toggle-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--secondary-text);
  cursor: pointer;
  user-select: none;
  transition: color 0.15s ease;
}

.toggle-label:hover {
  color: var(--text-color);
}

/*
  Switch-style toggle: the real checkbox stays interactive and fully clickable,
  sized to cover the switch track. We hide its native appearance but keep it
  on top (z-index + pointer-events) so .check()/.click() always hit the input.
  The track + knob are painted on a sibling <span> via ::before/::after.
*/
.toggle-label > span {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-left: 38px;
}

.toggle-label > span::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 18px;
  border-radius: var(--radius-pill);
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}

.toggle-label > span::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--secondary-text);
  box-shadow: var(--shadow-sm);
  transition:
    transform 0.18s cubic-bezier(0.34, 1.3, 0.64, 1),
    background 0.18s ease;
}

.toggle-label input[type='checkbox'] {
  position: absolute;
  left: 0;
  width: 32px;
  height: 20px;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
  -webkit-appearance: none;
  appearance: none;
}

.toggle-label input[type='checkbox']:checked + span::before {
  background: var(--accent-color);
  border-color: var(--accent-color);
}

.toggle-label input[type='checkbox']:checked + span::after {
  transform: translate(12px, -50%);
  background: var(--accent-contrast);
}

.toggle-label input[type='checkbox']:focus-visible + span::before {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.toggle-label input[type='checkbox']:disabled {
  cursor: not-allowed;
}

.toggle-label input[type='checkbox']:disabled + span {
  opacity: 0.5;
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
  bottom: var(--spacing-unit);
  right: var(--spacing-unit);
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px;
  font-size: 11.5px;
  color: var(--secondary-text);
  background: var(--sticky-bg);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-md);
  opacity: 0.92;
  pointer-events: none;
  z-index: 100;
}

.keyboard-hints kbd {
  display: inline-block;
  padding: 2px 6px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-color);
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-bottom-width: 2px;
  border-radius: 5px;
}

.keyboard-hints kbd + kbd {
  margin-left: 2px;
}

.keyboard-hints .hint-sep {
  color: var(--border-color);
  font-weight: 700;
}

.hints-fade-enter-active,
.hints-fade-leave-active {
  transition: opacity 0.3s ease;
}

.hints-fade-enter-from,
.hints-fade-leave-to {
  opacity: 0;
}

:where(a, button, input, select, [role='button'], [tabindex]):focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
</style>

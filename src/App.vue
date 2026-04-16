<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import DropZone from './components/DropZone.vue'
import StatusBar from './components/StatusBar.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import TranscriptView from './components/TranscriptView.vue'
import SessionList from './components/SessionList.vue'
import ModelSelector from './components/ModelSelector.vue'
import { MODELS, DEFAULT_MODEL, DEFAULT_DTYPE } from './models'
import { useTranscriber } from './composables/useTranscriber'
import { useBackendTranscriber } from './composables/useBackendTranscriber'
import type { TranscribeResult } from './composables/useTranscriber'
import { useFileUpload } from './composables/useFileUpload'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { VALID_TYPES, MAX_FILE_SIZE } from './composables/useFileUpload'
import { saveSession, listSessions, loadSessionData, deleteSession } from './composables/useSessionStore'
import type { Session } from './composables/useSessionStore'
import { createLogger } from './utils/logger'

const log = createLogger('App')

const workerTranscriber = useTranscriber()
const backendTranscriber = useBackendTranscriber()
const useBackend = ref(false)

const activeTranscriber = computed(() => useBackend.value ? backendTranscriber : workerTranscriber)
const status = computed(() => activeTranscriber.value.status.value)
const result = computed({
  get: () => activeTranscriber.value.result.value,
  set: (v) => { activeTranscriber.value.result.value = v },
})
const error = computed({
  get: () => activeTranscriber.value.error.value,
  set: (v) => { activeTranscriber.value.error.value = v },
})
const isProcessing = computed({
  get: () => activeTranscriber.value.isProcessing.value,
  set: (v) => { activeTranscriber.value.isProcessing.value = v },
})
const modelInfo = computed(() => activeTranscriber.value.modelInfo.value)
const downloadProgress = computed(() => activeTranscriber.value.downloadProgress.value)
const transcriptionTimeSec = computed(() => activeTranscriber.value.transcriptionTimeSec.value)
const transcriptionProgress = computed(() => activeTranscriber.value.transcriptionProgress.value)
const resetError = () => activeTranscriber.value.resetError()

const { handleFile } = useFileUpload()

const selectedModel = ref(DEFAULT_MODEL)
const selectedDtype = ref(DEFAULT_DTYPE)
const useVad = ref(true)

const backendModelOptions = computed(() =>
  backendTranscriber.backendInfo.value?.available_models.map(model => ({
    id: model.id,
    label: model.label,
  })) ?? [],
)

const visibleModelOptions = computed(() =>
  useBackend.value && backendModelOptions.value.length > 0
    ? backendModelOptions.value
    : Object.entries(MODELS).map(([id, cfg]) => ({ id, label: cfg.label })),
)

const showPrecisionSelector = computed(() => !useBackend.value)
const backendModelIds = computed(() => new Set(backendModelOptions.value.map(model => model.id)))
const canUseBackend = computed(() => backendAvailable.value && backendTranscriber.backendInfo.value !== null)

const ensureSelectedModelMatchesMode = () => {
  if (useBackend.value) {
    const backendInfo = backendTranscriber.backendInfo.value
    if (!backendInfo) return

    const availableIds = new Set(backendInfo.available_models.map(model => model.id))
    if (!availableIds.has(selectedModel.value)) {
      selectedModel.value = backendInfo.default_model
    }
    return
  }

  if (!(selectedModel.value in MODELS)) {
    selectedModel.value = DEFAULT_MODEL
  }
}

const resolvedBackendModel = computed(() => {
  const backendInfo = backendTranscriber.backendInfo.value
  if (!backendInfo) return undefined
  return backendModelIds.value.has(selectedModel.value) ? selectedModel.value : backendInfo.default_model
})

const currentTheme = ref('light')
const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', currentTheme.value)
  localStorage.setItem('vibe-theme', currentTheme.value)
}

const audioUrl = ref('')
const audioPlayerRef = ref<InstanceType<typeof AudioPlayer> | null>(null)
const isAudioStuck = ref(false)
const appError = ref<string | null>(null)
const backendChecked = ref(false)
const backendAvailable = ref(false)

const hasAudioSource = computed(() => audioUrl.value !== '')

useKeyboardShortcuts({
  togglePlay: () => audioPlayerRef.value?.togglePlay(),
  skip: (d) => audioPlayerRef.value?.skip(d),
  adjustVolume: (d) => audioPlayerRef.value?.adjustVolume(d),
}, hasAudioSource)

// Session state (display)
const sessions = ref<Session[]>([])
const activeSessionId = ref<string | null>(null)
const audioBlob = ref<Blob | null>(null)
const fileName = ref('')
const durationSec = ref(0)

// Transcription tracking (separate from display state)
const transcribingSessionId = ref<string | null>(null)
const transcribingBlob = ref<Blob | null>(null)
const transcribingFileName = ref('')
const transcribingDuration = ref(0)
const viewedTranscript = ref<TranscribeResult | null>(null)
const displayTranscriptionTime = ref<number | null>(null)

/** Revoke previous object URL to prevent memory leaks */
function revokeAudioUrl() {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = ''
  }
}

const showDropZone = computed(() => !isProcessing.value && !result.value)
const showStatus = computed(() => isProcessing.value && activeSessionId.value === transcribingSessionId.value)
const showTranscript = computed(() => result.value !== null)
const displayError = computed(() => error.value || appError.value)

const transcriptionTimeDisplay = computed(() => {
  const t = displayTranscriptionTime.value
  if (t === null) return ''
  if (t < 60) return `${t.toFixed(1)}s`
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}m ${s.toFixed(0)}s`
})

const onFileSelected = async (file: File) => {
  appError.value = null
  resetError()

  if (!VALID_TYPES.includes(file.type) && !file.type.startsWith('audio/')) {
    appError.value = `Invalid file type: ${file.type}. Please upload audio.`
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    appError.value = 'File too large. Maximum size is 100MB.'
    return
  }

  const sessionId = crypto.randomUUID()
  activeSessionId.value = sessionId
  transcribingSessionId.value = sessionId
  fileName.value = file.name
  transcribingFileName.value = file.name
  viewedTranscript.value = null
  displayTranscriptionTime.value = null
  isProcessing.value = true
  activeTranscriber.value.status.value = 'Reading file...'

  try {
    revokeAudioUrl()
    const { audioUrl: url, audioData, audioBlob: blob, durationSec: dur } = await handleFile(file)
    audioUrl.value = url
    audioBlob.value = blob
    durationSec.value = dur
    transcribingBlob.value = blob
    transcribingDuration.value = dur

    // Add temporary session to sidebar immediately
    sessions.value = [
      { id: sessionId, name: file.name, createdAt: Date.now(), durationSec: dur },
      ...sessions.value,
    ]

    log.info(`New transcription started (session: ${sessionId}, file: ${file.name}, VAD=${useVad.value}, backend=${useBackend.value})`)
    if (useBackend.value) {
      backendTranscriber.transcribe(file, resolvedBackendModel.value, useVad.value)
    } else {
      workerTranscriber.transcribe(audioData, selectedModel.value, selectedDtype.value, useVad.value)
    }
  } catch (err: unknown) {
    appError.value = err instanceof Error ? err.message : String(err)
    isProcessing.value = false
    log.error('File processing failed', err)
    // Remove temporary session on failure
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    transcribingSessionId.value = null
    transcribingBlob.value = null
  }
}

// Auto-save when transcription completes
watch(isProcessing, async (processing, wasProcessing) => {
  if (!wasProcessing || processing) return

  if (result.value && transcribingBlob.value && transcribingSessionId.value) {
    // Capture transcript before any async work (transcriber just set result.value)
    const transcriptToSave = result.value
    const savedSessionId = transcribingSessionId.value

    // Update display transcription time if viewing the completing session
    if (activeSessionId.value === savedSessionId) {
      displayTranscriptionTime.value = transcriptionTimeSec.value
    }

    // If viewing a different session, restore its transcript immediately (avoid flash)
    if (activeSessionId.value !== savedSessionId && viewedTranscript.value) {
      result.value = viewedTranscript.value
    }

    try {
      const session: Session = {
        id: savedSessionId,
        name: transcribingFileName.value,
        createdAt: Date.now(),
        durationSec: transcribingDuration.value,
        transcriptionTimeSec: transcriptionTimeSec.value ?? undefined,
      }
      log.info(`Auto-saving session ${savedSessionId}`)
      await saveSession(session, transcribingBlob.value, transcriptToSave)
      sessions.value = await listSessions()
    } catch (err: unknown) {
      log.error('Failed to save session', err)
    }
  } else if (transcribingSessionId.value) {
    // Transcription failed — remove temporary session
    sessions.value = sessions.value.filter(s => s.id !== transcribingSessionId.value)
  }

  transcribingSessionId.value = null
  transcribingBlob.value = null
})

const onSessionSelect = async (id: string) => {
  if (id === activeSessionId.value) return

  // If clicking the session currently being transcribed, restore progress view
  if (isProcessing.value && id === transcribingSessionId.value) {
    revokeAudioUrl()
    activeSessionId.value = id
    result.value = null
    audioUrl.value = URL.createObjectURL(transcribingBlob.value!)
    audioBlob.value = transcribingBlob.value
    fileName.value = transcribingFileName.value
    durationSec.value = transcribingDuration.value
    viewedTranscript.value = null
    displayTranscriptionTime.value = null
    error.value = null
    appError.value = null
    return
  }

  log.info(`Session selected: ${id}`)
  const data = await loadSessionData(id)
  if (!data) return

  const session = sessions.value.find(s => s.id === id)

  revokeAudioUrl()

  activeSessionId.value = id
  result.value = data.transcript
  viewedTranscript.value = data.transcript
  audioUrl.value = URL.createObjectURL(data.audioBlob)
  audioBlob.value = data.audioBlob
  fileName.value = session?.name ?? ''
  durationSec.value = session?.durationSec ?? 0
  displayTranscriptionTime.value = session?.transcriptionTimeSec ?? null
  error.value = null
  appError.value = null
}

const onSessionDelete = async (id: string) => {
  if (id === transcribingSessionId.value) return

  log.info(`Session deleted: ${id}`)
  await deleteSession(id)
  sessions.value = await listSessions()

  if (activeSessionId.value === id) {
    revokeAudioUrl()
    activeSessionId.value = null
    audioBlob.value = null
    result.value = null
    displayTranscriptionTime.value = null
    error.value = null
    appError.value = null
  }
}

const onNewSession = () => {
  if (isProcessing.value) return

  revokeAudioUrl()
  activeSessionId.value = null
  audioBlob.value = null
  result.value = null
  error.value = null
  appError.value = null
  fileName.value = ''
  durationSec.value = 0
  displayTranscriptionTime.value = null
  log.info('New session')
}

const onSeek = (ms: number) => {
  audioPlayerRef.value?.seekTo(ms)
}

watch([useBackend, () => backendTranscriber.backendInfo.value], () => {
  ensureSelectedModelMatchesMode()
}, { immediate: true })

const handleScroll = () => {
  isAudioStuck.value = window.scrollY > 0
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)
  
  const savedTheme = localStorage.getItem('vibe-theme')
  if (savedTheme) {
    currentTheme.value = savedTheme
    document.documentElement.setAttribute('data-theme', savedTheme)
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    currentTheme.value = 'dark'
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  try {
    sessions.value = await listSessions()
    log.info(`Loaded ${sessions.value.length} session(s)`)
  } catch (err: unknown) {
    log.error('Failed to load sessions', err)
  }

  const detected = await backendTranscriber.checkBackend()
  backendChecked.value = true
  backendAvailable.value = detected
  if (detected) {
    useBackend.value = true
    ensureSelectedModelMatchesMode()
    log.info('Backend detected, using GPU transcription')
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  revokeAudioUrl()
})
</script>

<template>
  <div class="app-layout">
    <SessionList
      :sessions="sessions"
      :active-session-id="activeSessionId"
      @select="onSessionSelect"
      @delete="onSessionDelete"
      @new-session="onNewSession"
    />
    <main class="main-content">
      <div class="container">
        <header>
          <h1>Vibe Transcription</h1>
          <div class="subtitle">Local, private audio transcription</div>
          <ModelSelector
            v-model:model-id="selectedModel"
            v-model:dtype="selectedDtype"
            :models="visibleModelOptions"
            :show-dtype="showPrecisionSelector"
            :disabled="isProcessing"
          />
          <div class="option-toggles">
            <label class="toggle-label">
              <input
                id="backend-toggle"
                type="checkbox"
                :checked="useBackend"
                :disabled="isProcessing || !canUseBackend"
                @change="useBackend = ($event.target as HTMLInputElement).checked"
              />
              <span>GPU backend{{ backendTranscriber.backendInfo.value ? ` (${backendTranscriber.backendInfo.value.device})` : '' }}</span>
            </label>
            <label class="toggle-label">
              <input
                id="vad-toggle"
                type="checkbox"
                :checked="useVad"
                :disabled="isProcessing"
                @change="useVad = ($event.target as HTMLInputElement).checked"
              />
              <span>VAD preprocessing</span>
            </label>
            <label class="toggle-label">
              <input
                id="theme-toggle"
                type="checkbox"
                :checked="currentTheme === 'dark'"
                @change="toggleTheme"
              />
              <span>Dark mode</span>
            </label>
          </div>
        </header>

        <div v-if="backendChecked && !backendAvailable" id="backend-warning" class="warning-banner">
          GPU backend is unreachable. Falling back to in-browser transcription.
        </div>

        <div v-show="displayError" id="error-container" class="error-container">
          {{ displayError }}
        </div>

        <DropZone
          v-show="showDropZone"
          @file-selected="onFileSelected"
        />

        <StatusBar
          v-show="showStatus"
          :status="status"
          :model-info="modelInfo"
          :download-progress="downloadProgress"
          :transcription-progress="transcriptionProgress"
        />

        <AudioPlayer
          v-show="audioUrl"
          :src="audioUrl"
          ref="audioPlayerRef"
          :class="{ stuck: isAudioStuck }"
        />

        <div v-show="result && displayTranscriptionTime != null" class="transcription-meta">
          Transcribed in {{ transcriptionTimeDisplay }}
        </div>

        <TranscriptView
          v-show="showTranscript && result"
          :chunks="result?.chunks || []"
          :currentTimeMs="audioPlayerRef?.currentTimeMs || 0"
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
  --font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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

[data-theme="dark"] {
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

.toggle-label input[type="checkbox"] {
  cursor: pointer;
  accent-color: var(--accent-color);
}

.toggle-label input[type="checkbox"]:disabled {
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

.hints-fade-enter-active, .hints-fade-leave-active {
  transition: opacity 0.3s ease;
}

.hints-fade-enter-from, .hints-fade-leave-to {
  opacity: 0;
}
</style>

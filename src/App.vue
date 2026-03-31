<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import DropZone from './components/DropZone.vue'
import StatusBar from './components/StatusBar.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import TranscriptView from './components/TranscriptView.vue'
import SessionList from './components/SessionList.vue'
import { useTranscriber } from './composables/useTranscriber'
import type { TranscribeResult } from './composables/useTranscriber'
import { useFileUpload } from './composables/useFileUpload'
import { VALID_TYPES, MAX_FILE_SIZE } from './composables/useFileUpload'
import { saveSession, listSessions, loadSessionData, deleteSession } from './composables/useSessionStore'
import type { Session } from './composables/useSessionStore'
import { createLogger } from './utils/logger'

const log = createLogger('App')

const { status, result, error, isProcessing, modelInfo, downloadProgress, transcriptionTimeSec, transcribe, resetError } = useTranscriber()
const { handleFile } = useFileUpload()

const audioUrl = ref('')
const audioPlayerRef = ref<InstanceType<typeof AudioPlayer> | null>(null)
const isAudioStuck = ref(false)
const appError = ref<string | null>(null)

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
  status.value = 'Reading file...'

  try {
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

    log.info(`New transcription started (session: ${sessionId}, file: ${file.name})`)
    transcribe(audioData)
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
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
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

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }

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
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
    activeSessionId.value = null
    audioUrl.value = ''
    audioBlob.value = null
    result.value = null
    displayTranscriptionTime.value = null
    error.value = null
    appError.value = null
  }
}

const onNewSession = () => {
  if (isProcessing.value) return

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  activeSessionId.value = null
  audioUrl.value = ''
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

const handleScroll = () => {
  isAudioStuck.value = window.scrollY > 0
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)
  try {
    sessions.value = await listSessions()
    log.info(`Loaded ${sessions.value.length} session(s)`)
  } catch (err: unknown) {
    log.error('Failed to load sessions', err)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
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
          <div class="subtitle">Local, private, in-browser audio transcription</div>
        </header>

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
  </div>
</template>

<style>
:root {
  --font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --bg-color: #ffffff;
  --text-color: #1a1a1a;
  --accent-color: #0066cc;
  --accent-light: #e6f0fa;
  --border-color: #e5e5e5;
  --secondary-text: #666666;
  --error-color: #d93025;
  --success-color: #188038;
  --radius: 8px;
  --spacing-unit: 16px;
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

.error-container {
  background-color: #fce8e6;
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

@media (max-width: 600px) {
  .main-content {
    padding: var(--spacing-unit);
  }

  h1 {
    font-size: 20px;
  }
}
</style>

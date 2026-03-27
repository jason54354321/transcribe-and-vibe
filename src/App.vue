<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import DropZone from './components/DropZone.vue'
import StatusBar from './components/StatusBar.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import TranscriptView from './components/TranscriptView.vue'
import { useTranscriber } from './composables/useTranscriber'
import { useFileUpload } from './composables/useFileUpload'
import { VALID_TYPES, MAX_FILE_SIZE } from './composables/useFileUpload'

const { status, result, error, isProcessing, modelInfo, downloadProgress, transcribe, resetError } = useTranscriber()
const { handleFile } = useFileUpload()

const audioUrl = ref('')
const audioPlayerRef = ref<InstanceType<typeof AudioPlayer> | null>(null)
const isAudioStuck = ref(false)
const appError = ref<string | null>(null)

const showDropZone = computed(() => !isProcessing.value && !result.value)
const showStatus = computed(() => isProcessing.value)
const showTranscript = computed(() => result.value !== null)
const displayError = computed(() => error.value || appError.value)

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

  isProcessing.value = true
  status.value = 'Reading file...'

  try {
    const { audioUrl: url, audioData } = await handleFile(file)
    audioUrl.value = url
    transcribe(audioData)
  } catch (err: unknown) {
    appError.value = err instanceof Error ? err.message : String(err)
    isProcessing.value = false
  }
}

const onSeek = (ms: number) => {
  audioPlayerRef.value?.seekTo(ms)
}

const handleScroll = () => {
  isAudioStuck.value = window.scrollY > 0
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
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

    <TranscriptView 
      v-show="showTranscript && result" 
      :chunks="result?.chunks || []" 
      :currentTimeMs="audioPlayerRef?.currentTimeMs || 0" 
      @seek="onSeek" 
    />
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

@media (max-width: 600px) {
  body {
    padding: var(--spacing-unit);
  }
  
  h1 {
    font-size: 20px;
  }
}
</style>

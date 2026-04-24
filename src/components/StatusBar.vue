<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import type { ModelInfo, DownloadProgress, TranscriptionProgress } from '../types/transcriber'

const props = defineProps<{
  status: string
  modelInfo?: ModelInfo | null
  downloadProgress?: Record<string, DownloadProgress>
  transcriptionProgress?: TranscriptionProgress | null
}>()

const EXECUTION_BACKEND_LABELS: Record<string, string> = {
  cpu: 'CPU',
  cuda: 'CUDA',
  mlx: 'MLX',
}

const HARDWARE_LABELS: Record<string, string> = {
  apple_silicon: 'Apple Silicon',
  cuda: 'CUDA-capable GPU',
  cpu: 'CPU',
}

const FILLER_MESSAGES = [
  'Extracting audio features…',
  'Decoding speech patterns…',
  'Analyzing sentence structure…',
  'Recognizing vocabulary…',
  'Optimizing text output…',
  'Aligning timestamps…',
  'Processing audio segments…',
  'Matching language model…',
  'Converting speech signals…',
  'Assembling transcription…',
]

const fillerIndex = ref(0)
let fillerTimer: ReturnType<typeof setInterval> | null = null

const isTranscribing = computed(
  () =>
    props.status === 'Transcribing…' ||
    props.status.startsWith('Transcribing segment') ||
    props.status === 'Detecting speech segments…' ||
    props.status === 'Transcribing...' ||
    props.status.startsWith('Transcribing... '),
)

const hasRealProgress = computed(() => {
  const tp = props.transcriptionProgress
  return tp != null && tp.totalChunks > 0
})

const progressPercent = computed(() => {
  const tp = props.transcriptionProgress
  if (!tp || tp.totalChunks === 0) return 0
  return Math.round((tp.completedChunks / tp.totalChunks) * 100)
})

const progressInfo = computed(() => {
  if (!isTranscribing.value || !hasRealProgress.value) return null
  const tp = props.transcriptionProgress!
  return `${tp.completedChunks} / ${tp.totalChunks} chunks — ${progressPercent.value}%`
})

const subStatus = computed(() => {
  if (!isTranscribing.value) return null
  return FILLER_MESSAGES[fillerIndex.value % FILLER_MESSAGES.length]
})

const showProgressBar = computed(() => props.status !== 'Transcription complete')

watch(isTranscribing, (active) => {
  if (active) {
    fillerIndex.value = 0
    fillerTimer = setInterval(() => {
      fillerIndex.value++
    }, 3000)
  } else {
    if (fillerTimer) {
      clearInterval(fillerTimer)
      fillerTimer = null
    }
  }
})

onUnmounted(() => {
  if (fillerTimer) {
    clearInterval(fillerTimer)
    fillerTimer = null
  }
})

const runtimeInfo = computed(() => {
  if (!props.modelInfo) return []

  const hardware = props.modelInfo.hardware
    ? (HARDWARE_LABELS[props.modelInfo.hardware] ?? props.modelInfo.hardware)
    : 'Unknown'
  const executionBackend = props.modelInfo.executionBackend
    ? (EXECUTION_BACKEND_LABELS[props.modelInfo.executionBackend] ??
      props.modelInfo.executionBackend)
    : 'Unknown'
  const model = props.modelInfo.model.split('/').pop() ?? props.modelInfo.model
  const details = [props.modelInfo.engine, props.modelInfo.dtype]
    .filter((part): part is string => Boolean(part))
    .join(' · ')

  return [
    { id: 'architecture', label: 'Architecture', value: hardware },
    { id: 'model', label: 'Model', value: model },
    { id: 'execution-backend', label: 'Execution backend', value: executionBackend, details },
  ]
})

const downloadFiles = computed(() => {
  const dp = props.downloadProgress
  if (!dp) return []
  return Object.values(dp).filter((f) => f.total > 0)
})

const showDownload = computed(() => downloadFiles.value.length > 0)

function formatFileName(file: string) {
  return file.split('/').pop() ?? file
}

function formatSize(dp: DownloadProgress) {
  const loaded = (dp.loaded / 1024 / 1024).toFixed(0)
  const total = (dp.total / 1024 / 1024).toFixed(0)
  return `${loaded} / ${total} MB`
}
</script>

<template>
  <div id="status-container" class="status-container">
    <div v-if="runtimeInfo.length > 0" id="runtime-info" class="runtime-info">
      <div
        v-for="item in runtimeInfo"
        :key="item.id"
        class="runtime-item"
        :id="`runtime-${item.id}`"
      >
        <div class="runtime-label">{{ item.label }}</div>
        <div class="runtime-value">{{ item.value }}</div>
        <div v-if="item.details" class="runtime-details">{{ item.details }}</div>
      </div>
    </div>

    <div v-if="showProgressBar && isTranscribing && hasRealProgress" class="determinate-track">
      <div class="determinate-bar" :style="{ width: progressPercent + '%' }"></div>
    </div>
    <div v-else-if="showProgressBar" class="indeterminate-track">
      <div class="indeterminate-bar"></div>
    </div>
    <div id="status-text" class="status-text">{{ status }}</div>
    <div v-if="progressInfo" class="progress-info">{{ progressInfo }}</div>
    <transition name="fade" mode="out-in">
      <div v-if="subStatus" :key="subStatus" class="sub-status">{{ subStatus }}</div>
    </transition>

    <div v-if="showDownload" id="download-progress" class="progress-section">
      <div
        v-for="dp in downloadFiles"
        :key="dp.file"
        class="download-item"
        :data-file="formatFileName(dp.file)"
      >
        <div class="progress-label">{{ formatFileName(dp.file) }} — {{ formatSize(dp) }}</div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: dp.progress + '%' }"></div>
        </div>
        <div class="progress-percent">{{ dp.progress }}%</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-container {
  text-align: center;
  margin: calc(var(--spacing-unit) * 3) 0;
}

.runtime-info {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: calc(var(--spacing-unit) * 0.75);
  margin-bottom: var(--spacing-unit);
  text-align: left;
}

.runtime-item {
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: calc(var(--spacing-unit) * 0.75);
}

.runtime-label {
  font-size: 12px;
  color: var(--secondary-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.runtime-value {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
}

.runtime-details {
  margin-top: 4px;
  font-size: 12px;
  color: var(--secondary-text);
  font-family: monospace;
}

.indeterminate-track {
  width: 100%;
  max-width: 400px;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  margin: 0 auto 12px;
  overflow: hidden;
  position: relative;
}

.indeterminate-bar {
  position: absolute;
  height: 100%;
  width: 30%;
  background: var(--accent-color);
  border-radius: 2px;
  animation: slide 1.5s ease-in-out infinite;
}

@keyframes slide {
  0% {
    left: -30%;
  }
  50% {
    left: 100%;
  }
  100% {
    left: -30%;
  }
}

.determinate-track {
  width: 100%;
  max-width: 400px;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  margin: 0 auto 12px;
  overflow: hidden;
}

.determinate-bar {
  height: 100%;
  background: var(--accent-color);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.status-text {
  color: var(--secondary-text);
  font-size: 14px;
}

.progress-info {
  color: var(--secondary-text);
  font-size: 13px;
  margin-top: 6px;
}

.sub-status {
  color: var(--secondary-text);
  font-size: 13px;
  margin-top: 6px;
  opacity: 0.7;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.progress-section {
  margin-top: 16px;
}

.download-item {
  margin-bottom: 12px;
}

.download-item:last-child {
  margin-bottom: 0;
}

.progress-label {
  font-size: 12px;
  color: var(--secondary-text);
  margin-bottom: 6px;
  font-family: monospace;
}

.progress-bar-track {
  width: 100%;
  max-width: 400px;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  margin: 0 auto;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 12px;
  color: var(--secondary-text);
  margin-top: 4px;
}

@media (max-width: 700px) {
  .runtime-info {
    grid-template-columns: 1fr;
  }
}
</style>

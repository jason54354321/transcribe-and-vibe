import { ref, onMounted, onUnmounted } from 'vue'
import { createLogger } from '../utils/logger'

export type TranscribeResult = {
  text: string
  chunks: Array<{ text: string; timestamp: [number, number] }>
}

export type ModelInfo = {
  model: string
  dtype: string
}

export type DownloadProgress = {
  file: string
  progress: number
  loaded: number
  total: number
}

export function useTranscriber() {
  const log = createLogger('Transcriber')
  const status = ref('Ready')
  const result = ref<TranscribeResult | null>(null)
  const error = ref<string | null>(null)
  const isProcessing = ref(false)
  const modelInfo = ref<ModelInfo | null>(null)
  const downloadProgress = ref<Record<string, DownloadProgress>>({})
  const transcriptionTimeSec = ref<number | null>(null)

  let worker: Worker | null = null
  let transcribeStartTime: number | null = null

  onMounted(() => {
    try {
      worker = new Worker(
        new URL('../worker.ts', import.meta.url),
        { type: 'module' },
      )

      worker.onmessage = (e) => {
        const msg = e.data

        switch (msg.type) {
          case 'progress':
            status.value = msg.status
            break
          case 'model-info':
            modelInfo.value = { model: msg.model, dtype: msg.dtype }
            break
          case 'download-progress':
            downloadProgress.value = {
              ...downloadProgress.value,
              [msg.file]: {
                file: msg.file,
                progress: msg.progress,
                loaded: msg.loaded,
                total: msg.total,
              },
            }
            break
          case 'result':
            result.value = msg.data
            if (transcribeStartTime !== null) {
              transcriptionTimeSec.value = (performance.now() - transcribeStartTime) / 1000
              log.info(`Transcription complete (${transcriptionTimeSec.value.toFixed(1)}s, ${msg.data.chunks.length} chunks)`)
            }
            isProcessing.value = false
            downloadProgress.value = {}
            break
          case 'error':
            error.value = msg.message
            log.error('Transcription failed', msg.message)
            isProcessing.value = false
            downloadProgress.value = {}
            break
        }
      }
    } catch {
      error.value = 'Failed to initialize worker.'
    }
  })

  onUnmounted(() => {
    if (worker) {
      worker.terminate()
      worker = null
    }
  })

  const transcribe = (audio: Float32Array) => {
    if (!worker) {
      error.value = 'Worker not initialized'
      return
    }

    error.value = null
    result.value = null
    isProcessing.value = true
    downloadProgress.value = {}
    transcriptionTimeSec.value = null
    transcribeStartTime = performance.now()

    log.info(`Starting transcription (${audio.length} samples)`)
    worker.postMessage({ type: 'transcribe', audio })
  }

  const resetError = () => {
    error.value = null
  }

  return {
    status,
    result,
    error,
    isProcessing,
    modelInfo,
    downloadProgress,
    transcriptionTimeSec,
    transcribe,
    resetError,
  }
}

import { ref, onMounted, onUnmounted } from 'vue'
import { createLogger } from '../utils/logger'

export type TranscribeResult = {
  text: string
  chunks: Array<{ text: string; timestamp: [number | null, number | null] }>
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

export type TranscriptionProgress = {
  completedChunks: number
  totalChunks: number
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
  const transcriptionProgress = ref<TranscriptionProgress | null>(null)

  let worker: Worker | null = null
  let transcribeStartTime: number | null = null

  onMounted(() => {
    try {
      worker = new Worker(
        new URL('../worker.ts', import.meta.url),
        { type: 'module' },
      )

      worker.onerror = (e) => {
        error.value = `Worker error: ${e.message || 'Unknown worker failure'}`
        isProcessing.value = false
        downloadProgress.value = {}
        transcriptionProgress.value = null
      }

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
          case 'transcription-progress':
            transcriptionProgress.value = {
              completedChunks: msg.completedChunks,
              totalChunks: msg.totalChunks,
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
            transcriptionProgress.value = null
            break
          case 'error':
            error.value = msg.message
            log.error('Transcription failed', msg.message)
            isProcessing.value = false
            downloadProgress.value = {}
            transcriptionProgress.value = null
            break
        }
      }
    } catch (err: unknown) {
      error.value = `Failed to initialize worker: ${err instanceof Error ? err.message : String(err)}`
    }
  })

  onUnmounted(() => {
    if (worker) {
      worker.terminate()
      worker = null
    }
  })

  const transcribe = (audio: Float32Array, model: string, dtype: string, useVad = true) => {
    if (!worker) {
      error.value = 'Worker not initialized'
      return
    }

    error.value = null
    result.value = null
    isProcessing.value = true
    downloadProgress.value = {}
    transcriptionTimeSec.value = null
    transcriptionProgress.value = null
    transcribeStartTime = performance.now()
    status.value = 'Sending to worker...'

    log.info(`Starting transcription (${audio.length} samples, VAD=${useVad})`)
    worker.postMessage({ type: 'transcribe', audio, model, dtype, useVad }, [audio.buffer])
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
    transcriptionProgress,
    transcribe,
    resetError,
  }
}

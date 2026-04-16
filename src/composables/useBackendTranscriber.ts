import { ref } from 'vue'
import { createLogger } from '../utils/logger'
import type {
  TranscribeResult,
  ModelInfo,
  DownloadProgress,
  TranscriptionProgress,
} from './useTranscriber'

export type { TranscribeResult, ModelInfo, DownloadProgress, TranscriptionProgress }

export type BackendInfo = {
  hardware: string
  device: string
  memory_gb: number
  engine: string
  default_model: string
  available_models: Array<{ id: string; label: string; description: string; vram_mb: number }>
}

export function useBackendTranscriber() {
  const log = createLogger('BackendTranscriber')
  const status = ref('Ready')
  const result = ref<TranscribeResult | null>(null)
  const error = ref<string | null>(null)
  const isProcessing = ref(false)
  const modelInfo = ref<ModelInfo | null>(null)
  const downloadProgress = ref<Record<string, DownloadProgress>>({})
  const transcriptionTimeSec = ref<number | null>(null)
  const transcriptionProgress = ref<TranscriptionProgress | null>(null)
  const backendInfo = ref<BackendInfo | null>(null)

  let abortController: AbortController | null = null
  let transcribeStartTime: number | null = null

  const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api'

  const checkBackend = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/info`)
      if (!res.ok) return false
      backendInfo.value = await res.json()
      log.info(`Backend connected: ${backendInfo.value!.engine} on ${backendInfo.value!.device}`)
      return true
    } catch {
      return false
    }
  }

  const parseSSE = (chunk: string): Array<{ event: string; data: string }> => {
    const events: Array<{ event: string; data: string }> = []
    const lines = chunk.split('\n')
    let currentEvent = ''
    let currentData = ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7)
      } else if (line.startsWith('data: ')) {
        currentData = line.slice(6)
      } else if (line === '' && currentEvent && currentData) {
        events.push({ event: currentEvent, data: currentData })
        currentEvent = ''
        currentData = ''
      }
    }
    return events
  }

  const setModelInfo = (data: Partial<ModelInfo>) => {
    if (typeof data.model !== 'string' || typeof data.dtype !== 'string') return
    modelInfo.value = { model: data.model, dtype: data.dtype }
  }

  const transcribe = async (file: File, modelId?: string, useVad = true) => {
    error.value = null
    result.value = null
    modelInfo.value = null
    isProcessing.value = true
    downloadProgress.value = {}
    transcriptionTimeSec.value = null
    transcriptionProgress.value = null
    transcribeStartTime = performance.now()
    status.value = 'Uploading...'

    abortController = new AbortController()

    const resolvedModel = modelId ?? backendInfo.value?.default_model ?? 'base'

    const formData = new FormData()
    formData.append('file', file)

    const params = new URLSearchParams()
    params.set('model', resolvedModel)
    params.set('vad', String(useVad))

    log.info(`Starting backend transcription (model=${resolvedModel}, VAD=${useVad})`)

    try {
      const res = await fetch(`${API_BASE}/transcribe?${params}`, {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Backend error ${res.status}: ${body}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = parseSSE(buffer)

        // Keep unprocessed tail (last incomplete event)
        const lastNewline = buffer.lastIndexOf('\n\n')
        buffer = lastNewline >= 0 ? buffer.slice(lastNewline + 2) : buffer

        for (const evt of events) {
          const data = JSON.parse(evt.data)

          switch (evt.event) {
            case 'model-loading':
              status.value = data.status
              break
            case 'model-info':
              setModelInfo(data)
              break
            case 'transcribing':
              status.value = data.status
              if (data.progress != null) {
                transcriptionProgress.value = {
                  completedChunks: Math.round(Number(data.progress)),
                  totalChunks: 100,
                }
              }
              break
            case 'result':
              result.value = data
              setModelInfo(data)
              if (transcribeStartTime !== null) {
                transcriptionTimeSec.value = (performance.now() - transcribeStartTime) / 1000
                log.info(`Transcription complete (${transcriptionTimeSec.value.toFixed(1)}s, ${data.chunks.length} chunks)`)
              }
              isProcessing.value = false
              downloadProgress.value = {}
              transcriptionProgress.value = null
              break
            case 'error':
              error.value = data.message
              log.error('Backend transcription failed', data.message)
              isProcessing.value = false
              downloadProgress.value = {}
              transcriptionProgress.value = null
              break
          }
        }
      }

      if (isProcessing.value) {
        error.value = 'Transcription stream ended unexpectedly'
        isProcessing.value = false
        transcriptionProgress.value = null
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        log.info('Transcription aborted')
      } else {
        error.value = err instanceof Error ? err.message : String(err)
        log.error('Transcription request failed', err)
      }
      isProcessing.value = false
      downloadProgress.value = {}
      transcriptionProgress.value = null
    }
  }

  const abort = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
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
    backendInfo,
    checkBackend,
    transcribe,
    abort,
    resetError,
  }
}

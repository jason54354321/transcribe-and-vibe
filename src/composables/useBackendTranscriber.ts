import { ref } from 'vue'
import { createLogger } from '../utils/logger'
import type {
  TranscribeResult,
  ModelInfo,
  DownloadProgress,
  TranscriptionProgress,
} from '../types/transcriber'

export type { TranscribeResult, ModelInfo, DownloadProgress, TranscriptionProgress }

export type BackendInfo = {
  hardware: string
  device: string
  memory_gb: number
  engine: string
  execution_backend: string
  acceleration: 'cpu' | 'gpu'
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
    } catch (err: unknown) {
      log.error('Backend health check failed', err)
      backendInfo.value = null
      return false
    }
  }

  const parseSSE = (
    chunk: string,
  ): { events: Array<{ event: string; data: string }>; remaining: string } => {
    const events: Array<{ event: string; data: string }> = []
    const blocks = chunk.split('\n\n')
    const remaining = blocks.pop() ?? ''

    for (const block of blocks) {
      const lines = block.split('\n')
      let currentEvent = ''
      const dataLines: string[] = []

      for (const rawLine of lines) {
        const line = rawLine.trimEnd()

        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7)
        } else if (line.startsWith('data: ')) {
          dataLines.push(line.slice(6))
        }
      }

      if (currentEvent && dataLines.length > 0) {
        events.push({ event: currentEvent, data: dataLines.join('\n') })
      }
    }

    return { events, remaining }
  }

  const setModelInfo = (data: Partial<ModelInfo>) => {
    if (typeof data.model !== 'string') return

    const executionBackend =
      typeof data.executionBackend === 'string'
        ? data.executionBackend
        : typeof (data as Partial<{ execution_backend: string }>).execution_backend === 'string'
          ? (data as Partial<{ execution_backend: string }>).execution_backend
          : undefined

    modelInfo.value = {
      hardware: typeof data.hardware === 'string' ? data.hardware : undefined,
      model: data.model,
      dtype: typeof data.dtype === 'string' ? data.dtype : undefined,
      engine: typeof data.engine === 'string' ? data.engine : undefined,
      executionBackend,
    }
  }

  const parseProgressValue = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }

  const getBackendUnavailableMessage = () =>
    'Backend is unreachable. Start the backend service, then try transcription again.'

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
        const parsed = parseSSE(buffer)
        buffer = parsed.remaining

        for (const evt of parsed.events) {
          const data = JSON.parse(evt.data) as Record<string, unknown>

          switch (evt.event) {
            case 'model-loading':
              if (typeof data.status === 'string') {
                status.value = data.status
              }
              break
            case 'model-info':
              setModelInfo(data)
              break
            case 'transcribing':
              if (typeof data.status === 'string') {
                status.value = data.status
              }
              if (data.progress != null && transcriptionProgress.value === null) {
                const fallbackProgress = parseProgressValue(data.progress)
                if (fallbackProgress !== null) {
                  transcriptionProgress.value = {
                    completedChunks: Math.round(fallbackProgress),
                    totalChunks: 100,
                  }
                }
              }
              break
            case 'transcription-progress': {
              const completedChunks = parseProgressValue(
                data.completedChunks ?? data.completed_chunks,
              )
              const totalChunks = parseProgressValue(data.totalChunks ?? data.total_chunks)

              if (completedChunks !== null && totalChunks !== null && totalChunks > 0) {
                transcriptionProgress.value = {
                  completedChunks: Math.round(completedChunks),
                  totalChunks: Math.round(totalChunks),
                }
              }
              break
            }
            case 'result':
              result.value = data as unknown as TranscribeResult
              setModelInfo(data)
              if (transcribeStartTime !== null) {
                transcriptionTimeSec.value = (performance.now() - transcribeStartTime) / 1000
                log.info(
                  `Transcription complete (${transcriptionTimeSec.value.toFixed(1)}s, ${result.value.chunks.length} chunks)`,
                )
              }
              status.value = 'Transcription complete'
              isProcessing.value = false
              downloadProgress.value = {}
              transcriptionProgress.value = null
              break
            case 'error':
              error.value =
                typeof data.message === 'string' ? data.message : 'Backend transcription failed'
              log.error('Backend transcription failed', error.value)
              status.value = 'Transcription failed'
              isProcessing.value = false
              downloadProgress.value = {}
              transcriptionProgress.value = null
              break
          }
        }
      }

      buffer += decoder.decode()
      const finalEvents = parseSSE(buffer + (buffer.endsWith('\n\n') ? '' : '\n\n')).events
      for (const evt of finalEvents) {
        const data = JSON.parse(evt.data) as Record<string, unknown>

        if (evt.event === 'result') {
          result.value = data as unknown as TranscribeResult
          setModelInfo(data)
          if (transcribeStartTime !== null) {
            transcriptionTimeSec.value = (performance.now() - transcribeStartTime) / 1000
          }
          status.value = 'Transcription complete'
          isProcessing.value = false
          downloadProgress.value = {}
          transcriptionProgress.value = null
        } else if (evt.event === 'error') {
          error.value =
            typeof data.message === 'string' ? data.message : 'Backend transcription failed'
          status.value = 'Transcription failed'
          isProcessing.value = false
          downloadProgress.value = {}
          transcriptionProgress.value = null
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
        status.value = 'Transcription aborted'
      } else if (err instanceof TypeError) {
        error.value = getBackendUnavailableMessage()
        status.value = 'Backend unavailable'
        log.error('Backend request failed', err)
      } else {
        error.value = err instanceof Error ? err.message : String(err)
        status.value = 'Transcription failed'
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

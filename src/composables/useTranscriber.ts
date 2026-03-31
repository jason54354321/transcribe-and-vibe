import { ref, onMounted, onUnmounted } from 'vue'
import { NonRealTimeVAD } from '@ricky0123/vad-web'
import { mergeVadSegments, offsetTimestamps, sliceAudio } from '../utils/vadPipeline'
import type { VadSegment, TranscribeChunk } from '../utils/vadPipeline'
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
  let vadInstance: NonRealTimeVAD | null = null
  let pendingResolve: ((data: TranscribeResult) => void) | null = null
  let pendingReject: ((err: Error) => void) | null = null

  onMounted(() => {
    try {
      worker = new Worker('/worker.js', { type: 'module' })

      worker.onmessage = (e) => {
        const msg = e.data

        switch (msg.type) {
          case 'progress':
            if (!pendingResolve || msg.status !== 'Transcribing…') {
              status.value = msg.status
            }
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
            if (pendingResolve) {
              pendingResolve(msg.data)
              pendingResolve = null
              pendingReject = null
            }
            break
          case 'error':
            if (pendingReject) {
              pendingReject(new Error(msg.message))
              pendingResolve = null
              pendingReject = null
            } else {
              error.value = msg.message
              isProcessing.value = false
              downloadProgress.value = {}
            }
            break
        }
      }
    } catch {
      error.value = "Failed to initialize worker. Please ensure worker.js is present."
    }
  })

  onUnmounted(() => {
    if (worker) {
      worker.terminate()
      worker = null
    }
  })

  function transcribeSegment(audio: Float32Array): Promise<TranscribeResult> {
    return new Promise((resolve, reject) => {
      if (!worker) {
        reject(new Error('Worker not initialized'))
        return
      }
      pendingResolve = resolve
      pendingReject = reject
      worker.postMessage({ type: 'transcribe', audio })
    })
  }

  async function detectSpeechSegments(audio: Float32Array, sampleRate: number): Promise<VadSegment[]> {
    if (!vadInstance) {
      vadInstance = await NonRealTimeVAD.new()
    }
    const segments: VadSegment[] = []
    for await (const { start, end } of vadInstance.run(audio, sampleRate)) {
      segments.push({ start, end })
    }
    return segments
  }

  const transcribe = async (audio: Float32Array) => {
    if (!worker) {
      error.value = "Worker not initialized"
      return
    }

    error.value = null
    result.value = null
    isProcessing.value = true
    downloadProgress.value = {}
    transcriptionTimeSec.value = null
    const startTime = performance.now()

    log.info(`Starting transcription (${audio.length} samples)`)

    try {
      status.value = 'Detecting speech segments…'
      let segments: VadSegment[]
      try {
        const rawSegments = await detectSpeechSegments(audio, 16000)
        segments = mergeVadSegments(rawSegments)
        log.info(`VAD detected ${segments.length} segment(s)`)
      } catch {
        segments = [{ start: 0, end: (audio.length / 16000) * 1000 }]
        log.warn('VAD failed, falling back to single segment')
      }

      if (segments.length === 0) {
        result.value = { text: '', chunks: [] }
        log.info('No speech detected')
        return
      }

      const allChunks: TranscribeChunk[] = []
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        status.value = segments.length > 1
          ? `Transcribing segment ${i + 1}/${segments.length}…`
          : 'Transcribing…'

        log.info(`Transcribing segment ${i + 1}/${segments.length} (${(seg.start / 1000).toFixed(1)}s–${(seg.end / 1000).toFixed(1)}s)`)
        const segStart = performance.now()

        const segAudio = sliceAudio(audio, seg.start, seg.end, 16000)
        const segResult = await transcribeSegment(segAudio)
        const offsetS = seg.start / 1000
        allChunks.push(...offsetTimestamps(segResult.chunks, offsetS))

        log.info(`Segment ${i + 1}/${segments.length} done (${((performance.now() - segStart) / 1000).toFixed(1)}s)`)
      }

      result.value = {
        text: allChunks.map(c => c.text).join(''),
        chunks: allChunks,
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      log.error('Transcription failed', err)
    } finally {
      if (result.value !== null) {
        transcriptionTimeSec.value = (performance.now() - startTime) / 1000
        log.info(`Transcription complete (${transcriptionTimeSec.value.toFixed(1)}s, ${result.value.chunks.length} chunks)`)
      }
      isProcessing.value = false
      downloadProgress.value = {}
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
    transcribe,
    resetError,
  }
}

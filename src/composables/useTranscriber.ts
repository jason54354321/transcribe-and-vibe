import { ref, onMounted, onUnmounted } from 'vue'
import { NonRealTimeVAD } from '@ricky0123/vad-web'
import { mergeVadSegments, offsetTimestamps, sliceAudio } from '../utils/vadPipeline'
import type { VadSegment, TranscribeChunk } from '../utils/vadPipeline'

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
  const status = ref('Ready')
  const result = ref<TranscribeResult | null>(null)
  const error = ref<string | null>(null)
  const isProcessing = ref(false)
  const modelInfo = ref<ModelInfo | null>(null)
  const downloadProgress = ref<Record<string, DownloadProgress>>({})

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

    try {
      status.value = 'Detecting speech segments…'
      let segments: VadSegment[]
      try {
        const rawSegments = await detectSpeechSegments(audio, 16000)
        segments = mergeVadSegments(rawSegments)
      } catch {
        segments = [{ start: 0, end: (audio.length / 16000) * 1000 }]
      }

      if (segments.length === 0) {
        result.value = { text: '', chunks: [] }
        return
      }

      const allChunks: TranscribeChunk[] = []
      for (let i = 0; i < segments.length; i++) {
        status.value = segments.length > 1
          ? `Transcribing segment ${i + 1}/${segments.length}…`
          : 'Transcribing…'

        const seg = segments[i]
        const segAudio = sliceAudio(audio, seg.start, seg.end, 16000)
        const segResult = await transcribeSegment(segAudio)
        const offsetS = seg.start / 1000
        allChunks.push(...offsetTimestamps(segResult.chunks, offsetS))
      }

      result.value = {
        text: allChunks.map(c => c.text).join(''),
        chunks: allChunks,
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
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
    transcribe,
    resetError
  }
}

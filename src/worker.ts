/**
 * Web Worker — full transcription pipeline (VAD + Whisper ASR)
 *
 * Runs VAD (Silero) and Whisper (HuggingFace Transformers) entirely in the
 * worker thread, keeping ~50–100 MB of ONNX/WASM runtime off the main thread.
 *
 * Inbound:  { type: 'transcribe', audio: Float32Array, useVad?: boolean }
 * Outbound: { type: 'progress',          status: string }
 *           { type: 'model-info',        model: string, dtype: string }
 *           { type: 'download-progress', file: string, progress: number, loaded: number, total: number }
 *           { type: 'result',            data: { text, chunks } }
 *           { type: 'error',             message: string }
 */

import { NonRealTimeVAD } from '@ricky0123/vad-web'
import { mergeVadSegments, offsetTimestamps, sliceAudio } from './utils/vadPipeline'
import type { VadSegment, TranscribeChunk } from './utils/vadPipeline'
import { createLogger } from './utils/logger'

const log = createLogger('Worker')

const DEFAULT_MODEL_ID = 'onnx-community/whisper-small_timestamped'
const DEFAULT_DTYPE = 'q8'
const CHUNK_LENGTH_S = 30
const STRIDE_LENGTH_S = 5

type ASRPipeline = (
  audio: Float32Array,
  options?: {
    return_timestamps?: string
    chunk_length_s?: number
    stride_length_s?: number
    streamer?: { put: () => void; end: () => void }
  },
) => Promise<{
  text: string
  chunks: TranscribeChunk[]
}>

function countAudioChunks(audioLength: number): number {
  const SR = 16000
  const window = SR * CHUNK_LENGTH_S
  const stride = SR * STRIDE_LENGTH_S
  const jump = window - 2 * stride

  if (audioLength <= window) return 1

  let chunks = 0
  let offset = 0
  while (offset + window <= audioLength) {
    chunks++
    offset += jump
  }
  if (offset < audioLength) chunks++
  return chunks
}

let whisperPipeline: ASRPipeline | null = null
let loadedModelId: string | null = null
let loadedDtype: string | null = null

async function getWhisperPipeline(modelId: string, dtype: string): Promise<ASRPipeline> {
  if (whisperPipeline && loadedModelId === modelId && loadedDtype === dtype) return whisperPipeline

  whisperPipeline = null
  loadedModelId = modelId
  loadedDtype = dtype

  postMessage({ type: 'model-info', model: modelId, dtype })
  postMessage({ type: 'progress', status: 'Loading model…' })

  const { pipeline } = await import(
    /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3'
  )

  whisperPipeline = await pipeline('automatic-speech-recognition', modelId, {
    dtype,
    device: 'wasm',
    progress_callback: (event) => {
      if (event.status === 'progress' && event.file) {
        postMessage({
          type: 'download-progress',
          file: event.file,
          progress: Math.round(event.progress ?? 0),
          loaded: event.loaded ?? 0,
          total: event.total ?? 0,
        })
      }
    },
  })

  postMessage({ type: 'progress', status: 'Model loaded.' })
  return whisperPipeline
}

let vadInstance: NonRealTimeVAD | null = null

async function detectSpeechSegments(audio: Float32Array, sampleRate: number): Promise<VadSegment[]> {
  if (!vadInstance) {
    vadInstance = await NonRealTimeVAD.new({
      positiveSpeechThreshold: 0.2,
      negativeSpeechThreshold: 0.15,
      redemptionMs: 2000,
      minSpeechMs: 200,
      preSpeechPadMs: 1000,
    })
  }
  const segments: VadSegment[] = []
  for await (const { start, end } of vadInstance.run(audio, sampleRate)) {
    segments.push({ start, end })
  }
  return segments
}

async function transcribe(audio: Float32Array, modelId: string, dtype: string, useVad = true): Promise<void> {
  log.info(`Starting transcription (${audio.length} samples, VAD=${useVad})`)

  let segments: VadSegment[]
  if (useVad) {
    postMessage({ type: 'progress', status: 'Detecting speech segments…' })
    try {
      const rawSegments = await detectSpeechSegments(audio, 16000)
      segments = mergeVadSegments(rawSegments)
      log.info(`VAD detected ${segments.length} segment(s)`)
    } catch {
      segments = [{ start: 0, end: (audio.length / 16000) * 1000 }]
      log.warn('VAD failed, falling back to single segment')
    }
  } else {
    segments = [{ start: 0, end: (audio.length / 16000) * 1000 }]
    log.info('VAD disabled, using full audio as single segment')
  }

  if (segments.length === 0) {
    postMessage({ type: 'result', data: { text: '', chunks: [] } })
    log.info('No speech detected')
    return
  }

  const pipe = await getWhisperPipeline(modelId, dtype)
  const allChunks: TranscribeChunk[] = []

  const totalSegAudioLengths = segments.reduce((sum, seg) => {
    return sum + sliceAudio(audio, seg.start, seg.end, 16000).length
  }, 0)
  const totalChunks = countAudioChunks(totalSegAudioLengths)
  let completedChunks = 0

  postMessage({ type: 'transcription-progress', completedChunks: 0, totalChunks })

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const statusMsg = segments.length > 1
      ? `Transcribing segment ${i + 1}/${segments.length}…`
      : 'Transcribing…'
    postMessage({ type: 'progress', status: statusMsg })

    log.info(`Transcribing segment ${i + 1}/${segments.length} (${(seg.start / 1000).toFixed(1)}s–${(seg.end / 1000).toFixed(1)}s)`)
    const segStart = performance.now()

    const segAudio = sliceAudio(audio, seg.start, seg.end, 16000)

    const streamer = {
      put() {},
      end() {
        completedChunks++
        postMessage({ type: 'transcription-progress', completedChunks, totalChunks })
      },
    }

    const segResult = await pipe(segAudio, {
      return_timestamps: 'word',
      chunk_length_s: CHUNK_LENGTH_S,
      stride_length_s: STRIDE_LENGTH_S,
      streamer,
    })

    const offsetS = seg.start / 1000
    allChunks.push(...offsetTimestamps(segResult.chunks, offsetS))

    log.info(`Segment ${i + 1}/${segments.length} done (${((performance.now() - segStart) / 1000).toFixed(1)}s)`)
  }

  postMessage({
    type: 'result',
    data: {
      text: allChunks.map(c => c.text).join(''),
      chunks: allChunks,
    },
  })
}

addEventListener('message', async (e: MessageEvent) => {
  const { type, audio, model, dtype, useVad } = e.data
  if (type !== 'transcribe') return

  const modelId = model || DEFAULT_MODEL_ID
  const dtypeVal = dtype || DEFAULT_DTYPE

  try {
    if (!audio || audio.length === 0) {
      postMessage({ type: 'error', message: 'Empty audio data received.' })
      return
    }
    await transcribe(audio, modelId, dtypeVal, useVad !== false)
  } catch (err: unknown) {
    postMessage({
      type: 'error',
      message: `Failed to transcribe audio: ${err instanceof Error ? err.message : String(err)}`,
    })
  }
})

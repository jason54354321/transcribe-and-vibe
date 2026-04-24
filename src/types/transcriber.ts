import type { Ref } from 'vue'
import type { PreparedAudioSource } from '../composables/useFileUpload'

export type TranscribeResult = {
  text: string
  chunks: Array<{ text: string; timestamp: [number | null, number | null] }>
  hardware?: string
  model?: string
  dtype?: string
  engine?: string
  execution_backend?: string
}

export type ModelInfo = {
  hardware?: string
  model: string
  dtype?: string
  engine?: string
  executionBackend?: string
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

export type TranscribeOptions = {
  model: string
  useVad?: boolean
  dtype?: string
}

export interface TranscriberState {
  status: Ref<string>
  result: Ref<TranscribeResult | null>
  error: Ref<string | null>
  isProcessing: Ref<boolean>
  modelInfo: Ref<ModelInfo | null>
  downloadProgress: Ref<Record<string, DownloadProgress>>
  transcriptionTimeSec: Ref<number | null>
  transcriptionProgress: Ref<TranscriptionProgress | null>
  resetError: () => void
}

export interface UnifiedTranscriber extends TranscriberState {
  transcribe: (file: File, options: TranscribeOptions) => Promise<PreparedAudioSource>
}

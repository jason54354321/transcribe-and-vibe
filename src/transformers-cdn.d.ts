/**
 * Type declarations for @huggingface/transformers loaded from CDN.
 * The module is loaded at runtime via dynamic import (not bundled by Vite).
 */
declare module 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3' {
  type ProgressEvent = {
    status: string
    file?: string
    progress?: number
    loaded?: number
    total?: number
  }

  type TranscriptionResult = {
    text: string
    chunks: Array<{ text: string; timestamp: [number, number] }>
  }

  type ASRPipeline = (
    audio: Float32Array,
    options?: {
      return_timestamps?: string
      chunk_length_s?: number
      stride_length_s?: number
    },
  ) => Promise<TranscriptionResult>

  export function pipeline(
    task: string,
    model: string,
    options?: {
      dtype?: string
      device?: string
      progress_callback?: (event: ProgressEvent) => void
    },
  ): Promise<ASRPipeline>
}

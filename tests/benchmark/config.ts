/**
 * Benchmark configuration — extensible model × VAD matrix.
 *
 * To add models: append to DEFAULT_MODELS.
 * To add samples: place audio + transcript in tests/benchmark/, add to BENCHMARK_SAMPLES.
 */

export type BenchmarkModel = {
  /** HuggingFace model ID */
  id: string
  /** Human-readable label */
  label: string
  /** Quantization dtype */
  dtype: string
}

export type BenchmarkSample = {
  /** Unique sample identifier */
  id: string
  /** Path to audio file (relative to project root) */
  audioPath: string
  /** Path to reference transcript file (relative to project root) */
  referencePath: string
}

export type BenchmarkRunResult = {
  model: BenchmarkModel
  useVad: boolean
  sample: string
  hypothesis: string
  reference: string
  wer: number
  substitutions: number
  deletions: number
  insertions: number
  durationMs: number
}

/** Models to benchmark — add entries to extend */
export const DEFAULT_MODELS: BenchmarkModel[] = [
  {
    id: 'onnx-community/whisper-base_timestamped',
    label: 'Base',
    dtype: 'q8',
  },
  {
    id: 'onnx-community/whisper-small_timestamped',
    label: 'Small',
    dtype: 'q8',
  },
]

/** VAD on/off toggle */
export const VAD_OPTIONS = [true, false] as const

/**
 * Benchmark samples — local audio files with reference transcripts.
 *
 * To add a new sample:
 *   1. Place audio file (mp3/wav/m4a) in tests/benchmark/
 *   2. Place plain-text reference transcript alongside it
 *   3. Append an entry here
 */
export const BENCHMARK_SAMPLES: BenchmarkSample[] = [
  {
    id: 'l1',
    audioPath: 'tests/benchmark/l1.mp3',
    referencePath: 'tests/benchmark/l1_answer.txt',
  },
]

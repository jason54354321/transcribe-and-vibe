/**
 * Benchmark configuration loader.
 *
 * Source of truth: `tests/benchmark/benchmark.config.json`
 *
 * Open that file to see exactly what benchmark will run:
 * - which models
 * - which samples
 */

import benchmarkConfigJson from './benchmark.config.json'

export type BenchmarkModel = {
  /** Backend model ID */
  id: string
  /** Human-readable label */
  label: string
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
  sample: string
  hardware: string
  executionBackend: string
  hypothesis: string
  reference: string
  wer: number
  substitutions: number
  deletions: number
  insertions: number
  durationMs: number
}

type BenchmarkConfigFile = {
  models: BenchmarkModel[]
  samples: BenchmarkSample[]
}

function isBenchmarkModel(value: unknown): value is BenchmarkModel {
  return (
    typeof value === 'object' &&
    value != null &&
    typeof (value as BenchmarkModel).id === 'string' &&
    typeof (value as BenchmarkModel).label === 'string'
  )
}

function isBenchmarkSample(value: unknown): value is BenchmarkSample {
  return (
    typeof value === 'object' &&
    value != null &&
    typeof (value as BenchmarkSample).id === 'string' &&
    typeof (value as BenchmarkSample).audioPath === 'string' &&
    typeof (value as BenchmarkSample).referencePath === 'string'
  )
}

function parseConfigFile(rawValue: string): BenchmarkConfigFile {
  const parsed = JSON.parse(rawValue) as unknown

  if (typeof parsed !== 'object' || parsed == null) {
    throw new Error('Benchmark config must be a JSON object')
  }

  const { models, samples } = parsed as Partial<BenchmarkConfigFile>

  if (!Array.isArray(models) || models.length === 0 || !models.every(isBenchmarkModel)) {
    throw new Error('Benchmark config "models" must be a non-empty array of { id, label }')
  }

  if (!Array.isArray(samples) || samples.length === 0 || !samples.every(isBenchmarkSample)) {
    throw new Error(
      'Benchmark config "samples" must be a non-empty array of { id, audioPath, referencePath }',
    )
  }

  return { models, samples }
}

const benchmarkConfig = parseConfigFile(JSON.stringify(benchmarkConfigJson))

export const DEFAULT_MODELS: BenchmarkModel[] = benchmarkConfig.models

/**
 * Benchmark samples — local audio files with reference transcripts.
 *
 * To add a new sample:
 *   1. Place audio file (mp3/wav/m4a) in tests/benchmark/
 *   2. Place plain-text reference transcript alongside it
 *   3. Add an entry to tests/benchmark/benchmark.config.json
 */
export const BENCHMARK_SAMPLES: BenchmarkSample[] = benchmarkConfig.samples

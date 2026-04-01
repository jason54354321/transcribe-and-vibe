/**
 * Load benchmark samples from local fixture files.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { BENCHMARK_SAMPLES } from './config'

export type LoadedSample = {
  id: string
  audioPath: string
  reference: string
}

/** Lines matching these patterns are stripped from reference transcripts (service watermarks). */
const METADATA_PATTERNS = [
  'Transcribed by',
  'Upgrade to remove',
]

/**
 * Strip metadata / watermark lines from reference text.
 */
function stripMetadata(text: string): string {
  return text
    .split('\n')
    .filter(line => !METADATA_PATTERNS.some(p => line.includes(p)))
    .join('\n')
    .trim()
}

/**
 * Load benchmark samples, reading reference transcripts from disk.
 * @param sampleIds — optional filter; loads all samples if omitted
 */
export function loadSamples(sampleIds?: string[]): LoadedSample[] {
  const samples = sampleIds
    ? BENCHMARK_SAMPLES.filter(s => sampleIds.includes(s.id))
    : BENCHMARK_SAMPLES

  return samples.map(s => {
    const audioAbsPath = path.resolve(process.cwd(), s.audioPath)
    const refAbsPath = path.resolve(process.cwd(), s.referencePath)

    if (!fs.existsSync(audioAbsPath)) {
      throw new Error(`Audio file not found: ${audioAbsPath}`)
    }
    if (!fs.existsSync(refAbsPath)) {
      throw new Error(`Reference file not found: ${refAbsPath}`)
    }

    const rawRef = fs.readFileSync(refAbsPath, 'utf-8')
    const reference = stripMetadata(rawRef)

    return { id: s.id, audioPath: audioAbsPath, reference }
  })
}

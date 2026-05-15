/// <reference types="node" />
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { BenchmarkRunResult } from './config'
import {
  assertExpectedRuntime,
  buildBenchmarkResultsTable,
  createBenchmarkTimestamp,
  writeBenchmarkArtifacts,
} from './report'

describe('benchmark report', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()
      if (dir) fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails when backend acceleration does not match expected runtime', () => {
    expect(() => {
      assertExpectedRuntime('gpu', {
        hardware: 'cpu',
        device: 'Forced CPU mode',
        engine: 'faster-whisper',
        execution_backend: 'cpu',
        acceleration: 'cpu',
      })
    }).toThrow('Benchmark expected GPU but backend is running CPU')
  })

  it('creates a path-safe timestamp for result folders', () => {
    expect(createBenchmarkTimestamp(new Date('2026-04-27T12:34:56.789Z'))).toBe(
      '2026-04-27T12-34-56-789Z',
    )
  })

  it('renders the requested markdown result columns', () => {
    const table = buildBenchmarkResultsTable([
      createResult({ durationMs: 39_709, wer: 0.2686915888 }),
    ])

    expect(table).toContain(
      '| model | sample | usedTime | wer | substitutions | deletions | insertions |',
    )
    expect(table).toContain('| Base | l1 | 0m 40s | 26.87% | 5 | 106 | 4 |')
  })

  it('writes summary.md and results.json into a timestamped results folder', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-benchmark-'))
    tempDirs.push(tempRoot)

    const outputDir = writeBenchmarkArtifacts(
      [
        createResult({
          durationMs: 134_073,
          wer: 0.18691588785,
          substitutions: 6,
          deletions: 68,
          insertions: 6,
        }),
      ],
      {
        expectedRuntime: 'gpu',
        acceleration: 'gpu',
        hardware: 'cuda',
        engine: 'faster-whisper',
        executionBackend: 'cuda',
        device: 'NVIDIA RTX',
      },
      new Date('2026-04-27T12:34:56.789Z'),
      tempRoot,
    )

    expect(outputDir).toBe(path.join(tempRoot, 'tests/benchmark/results/2026-04-27T12-34-56-789Z'))

    const summary = fs.readFileSync(path.join(outputDir, 'summary.md'), 'utf-8')
    expect(summary).toContain('# Benchmark Results')
    expect(summary).toContain('- expectedRuntime: gpu')
    expect(summary).toContain('| Base | l1 | 2m 14s | 18.69% | 6 | 68 | 6 |')

    const json = JSON.parse(fs.readFileSync(path.join(outputDir, 'results.json'), 'utf-8')) as {
      generatedAt: string
      runtime: { acceleration: string }
      results: Array<{ usedTime: string; wer: number }>
    }

    expect(json.generatedAt).toBe('2026-04-27T12:34:56.789Z')
    expect(json.runtime.acceleration).toBe('gpu')
    expect(json.results[0]).toMatchObject({ usedTime: '2m 14s', wer: 0.18691588785 })
  })
})

function createResult(overrides: Partial<BenchmarkRunResult>): BenchmarkRunResult {
  const model = overrides.model ?? { id: 'base', label: 'Base' }

  return {
    model,
    sample: 'l1',
    hardware: 'cuda',
    executionBackend: 'cuda',
    hypothesis: 'hello world',
    reference: 'hello world',
    wer: 0,
    substitutions: 5,
    deletions: 106,
    insertions: 4,
    durationMs: 39_709,
    ...overrides,
  }
}

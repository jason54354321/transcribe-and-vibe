import { describe, expect, it } from 'vitest'

import { BENCHMARK_SAMPLES, DEFAULT_MODELS, EXPECTED_RUNTIME } from './config'

describe('benchmark config', () => {
  it('loads the full benchmark matrix from one config file', () => {
    expect(EXPECTED_RUNTIME).toBe('gpu')
    expect(DEFAULT_MODELS).toEqual([
      { id: 'base', label: 'Base' },
      { id: 'small', label: 'Small' },
      { id: 'large-v3', label: 'Large V3' },
    ])
    expect(BENCHMARK_SAMPLES).toEqual([
      {
        id: 'l1',
        audioPath: 'tests/benchmark/l1.mp3',
        referencePath: 'tests/benchmark/l1_answer.txt',
      },
    ])
  })
})

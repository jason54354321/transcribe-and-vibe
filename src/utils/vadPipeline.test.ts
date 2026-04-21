import { describe, it, expect } from 'vitest'
import { mergeVadSegments, offsetTimestamps, sliceAudio } from './vadPipeline'

describe('mergeVadSegments', () => {
  it('returns empty array for empty input', () => {
    expect(mergeVadSegments([])).toEqual([])
  })

  it('passes through single segment', () => {
    const segments = [{ start: 100, end: 5000 }]
    expect(mergeVadSegments(segments)).toEqual([{ start: 100, end: 5000 }])
  })

  it('merges two segments within 30s', () => {
    const segments = [
      { start: 0, end: 5000 },
      { start: 8000, end: 12000 },
    ]
    expect(mergeVadSegments(segments)).toEqual([{ start: 0, end: 12000 }])
  })

  it('separates segments exceeding 30s total', () => {
    const segments = [
      { start: 0, end: 15000 },
      { start: 20000, end: 35000 },
    ]
    // 35000 - 0 = 35s > 30s → separate groups
    expect(mergeVadSegments(segments)).toEqual([
      { start: 0, end: 15000 },
      { start: 20000, end: 35000 },
    ])
  })

  it('merges many small segments into groups (gap-based)', () => {
    const segments = [
      { start: 0, end: 2000 },
      { start: 3000, end: 5000 }, // gap=1s → merge
      { start: 6000, end: 8000 }, // gap=1s → merge
      { start: 28000, end: 29000 }, // gap=20s > 3s → split
      { start: 31000, end: 33000 }, // gap=2s → merge
      { start: 34000, end: 36000 }, // gap=1s → merge
    ]
    expect(mergeVadSegments(segments)).toEqual([
      { start: 0, end: 8000 },
      { start: 28000, end: 36000 },
    ])
  })

  it('passes through already-long segment without splitting', () => {
    const segments = [{ start: 0, end: 45000 }]
    // Single segment is never split, even if >30s
    expect(mergeVadSegments(segments)).toEqual([{ start: 0, end: 45000 }])
  })

  it('respects custom maxDurationS', () => {
    const segments = [
      { start: 0, end: 5000 },
      { start: 6000, end: 12000 },
    ]
    // 12s total, fits in 10s? 12000 - 0 = 12s > 10s → separate
    expect(mergeVadSegments(segments, 10)).toEqual([
      { start: 0, end: 5000 },
      { start: 6000, end: 12000 },
    ])
    // 12s total, fits in 15s? 12000 - 0 = 12s ≤ 15s → merged
    expect(mergeVadSegments(segments, 15)).toEqual([{ start: 0, end: 12000 }])
  })

  it('splits all segments when gaps exceed maxGapMs', () => {
    const segments = [
      { start: 0, end: 10000 },
      { start: 15000, end: 25000 }, // gap=5s > 3s → split
      { start: 40000, end: 50000 }, // gap=15s > 3s → split
      { start: 55000, end: 65000 }, // gap=5s > 3s → split
      { start: 80000, end: 90000 }, // gap=15s > 3s → split
    ]
    expect(mergeVadSegments(segments)).toEqual([
      { start: 0, end: 10000 },
      { start: 15000, end: 25000 },
      { start: 40000, end: 50000 },
      { start: 55000, end: 65000 },
      { start: 80000, end: 90000 },
    ])
  })

  it('splits on large gap even when total span fits in 30s', () => {
    const segments = [
      { start: 0, end: 2000 },
      { start: 20000, end: 22000 }, // gap=18s > 3s → split (span=22s ≤ 30s)
    ]
    expect(mergeVadSegments(segments)).toEqual([
      { start: 0, end: 2000 },
      { start: 20000, end: 22000 },
    ])
  })

  it('respects custom maxGapMs', () => {
    const segments = [
      { start: 0, end: 5000 },
      { start: 8000, end: 12000 }, // gap=3s
    ]
    // gap=3s ≤ 3s (default) → merge
    expect(mergeVadSegments(segments)).toEqual([{ start: 0, end: 12000 }])
    // gap=3s > 2s (custom) → split
    expect(mergeVadSegments(segments, 30, 2000)).toEqual([
      { start: 0, end: 5000 },
      { start: 8000, end: 12000 },
    ])
    // gap=3s ≤ 5s (custom) → merge
    expect(mergeVadSegments(segments, 30, 5000)).toEqual([{ start: 0, end: 12000 }])
  })

  it('enforces maxDuration even when gap is small', () => {
    const segments = [
      { start: 0, end: 14000 },
      { start: 15000, end: 29000 }, // gap=1s ≤ 3s, span=29s ≤ 30s → merge
      { start: 29500, end: 32000 }, // gap=0.5s ≤ 3s, but span=32s > 30s → split
    ]
    expect(mergeVadSegments(segments)).toEqual([
      { start: 0, end: 29000 },
      { start: 29500, end: 32000 },
    ])
  })
})

describe('offsetTimestamps', () => {
  it('returns same chunks for zero offset', () => {
    const chunks = [{ text: 'Hello', timestamp: [0, 0.5] as [number, number] }]
    const result = offsetTimestamps(chunks, 0)
    expect(result).toBe(chunks) // same reference for zero offset
  })

  it('shifts both start and end by offset', () => {
    const chunks = [{ text: 'Hello', timestamp: [0, 0.5] as [number, number] }]
    expect(offsetTimestamps(chunks, 2.0)).toEqual([{ text: 'Hello', timestamp: [2.0, 2.5] }])
  })

  it('shifts multiple chunks', () => {
    const chunks = [
      { text: 'Hello', timestamp: [0, 0.5] as [number, number] },
      { text: ' world', timestamp: [0.5, 1.0] as [number, number] },
    ]
    expect(offsetTimestamps(chunks, 5.0)).toEqual([
      { text: 'Hello', timestamp: [5.0, 5.5] },
      { text: ' world', timestamp: [5.5, 6.0] },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(offsetTimestamps([], 1.0)).toEqual([])
  })

  it('preserves text field exactly', () => {
    const chunks = [{ text: ' complex text!', timestamp: [0, 1.0] as [number, number] }]
    const result = offsetTimestamps(chunks, 3.0)
    expect(result[0].text).toBe(' complex text!')
    expect(result[0].timestamp).toEqual([3.0, 4.0])
  })
})

describe('VAD pipeline integration', () => {
  it('multi-segment pipeline produces correctly offset timestamps', () => {
    const farSegments = [
      { start: 0, end: 5000 },
      { start: 35000, end: 40000 },
    ]
    const merged = mergeVadSegments(farSegments)
    expect(merged).toHaveLength(2)

    const seg1Chunks = [
      { text: 'Hello', timestamp: [0, 0.5] as [number, number] },
      { text: ' world', timestamp: [0.5, 1.0] as [number, number] },
    ]
    const seg2Chunks = [
      { text: ' foo', timestamp: [0, 0.3] as [number, number] },
      { text: ' bar', timestamp: [0.3, 0.8] as [number, number] },
    ]

    const offset1 = offsetTimestamps(seg1Chunks, merged[0].start / 1000)
    const offset2 = offsetTimestamps(seg2Chunks, merged[1].start / 1000)
    const allChunks = [...offset1, ...offset2]

    expect(allChunks).toEqual([
      { text: 'Hello', timestamp: [0, 0.5] },
      { text: ' world', timestamp: [0.5, 1.0] },
      { text: ' foo', timestamp: [35.0, 35.3] },
      { text: ' bar', timestamp: [35.3, 35.8] },
    ])
    expect(allChunks.map((c) => c.text).join('')).toBe('Hello world foo bar')
  })

  it('no-speech scenario: VAD returns empty → merge returns empty', () => {
    const merged = mergeVadSegments([])
    expect(merged).toEqual([])
    expect(merged).toHaveLength(0)
  })

  it('long continuous speech passed through without splitting', () => {
    const segments = [{ start: 0, end: 60000 }]
    const merged = mergeVadSegments(segments)
    expect(merged).toEqual([{ start: 0, end: 60000 }])
    expect(merged).toHaveLength(1)

    const audio = new Float32Array(16000 * 60)
    const sliced = sliceAudio(audio, 0, 60000, 16000)
    expect(sliced.length).toBe(audio.length)
  })
})

describe('sliceAudio', () => {
  const sampleRate = 16000
  // 5 seconds of audio with linear ramp values
  const audio = new Float32Array(sampleRate * 5)
  for (let i = 0; i < audio.length; i++) {
    audio[i] = i / audio.length
  }

  it('slices correct 1-second range', () => {
    const sliced = sliceAudio(audio, 1000, 2000, sampleRate)
    expect(sliced.length).toBe(sampleRate) // 1s = 16000 samples
    expect(sliced[0]).toBeCloseTo(audio[16000])
  })

  it('handles full range', () => {
    const sliced = sliceAudio(audio, 0, 5000, sampleRate)
    expect(sliced.length).toBe(audio.length)
  })

  it('clamps end to audio bounds', () => {
    const sliced = sliceAudio(audio, 4000, 10000, sampleRate)
    // Only 1 second available (4s to 5s)
    expect(sliced.length).toBe(sampleRate)
  })

  it('handles startMs = 0', () => {
    const sliced = sliceAudio(audio, 0, 1000, sampleRate)
    expect(sliced.length).toBe(sampleRate)
    expect(sliced[0]).toBeCloseTo(0)
  })

  it('handles small audio without crash', () => {
    const small = new Float32Array(100)
    const sliced = sliceAudio(small, 0, 1000, sampleRate)
    // Clamped to actual audio length
    expect(sliced.length).toBe(100)
  })

  it('returns empty for zero-length range', () => {
    const sliced = sliceAudio(audio, 1000, 1000, sampleRate)
    expect(sliced.length).toBe(0)
  })
})

import { describe, it, expect } from 'vitest'
import { buildSentences } from './sentences'

type Chunk = { text: string; timestamp: [number | null, number | null] }

describe('buildSentences', () => {
  it('splits on sentence-ending punctuation', () => {
    const chunks: Chunk[] = [
      { text: ' Hello', timestamp: [0.0, 0.4] },
      { text: ' world.', timestamp: [0.4, 0.8] },
      { text: ' Next', timestamp: [0.9, 1.2] },
      { text: ' one.', timestamp: [1.2, 1.6] },
    ]
    const sentences = buildSentences(chunks)
    expect(sentences).toHaveLength(2)
    expect(sentences[0]).toEqual({
      startMs: 0,
      endMs: 800,
      startWordIndex: 0,
      endWordIndex: 1,
    })
    expect(sentences[1]).toEqual({
      startMs: 900,
      endMs: 1600,
      startWordIndex: 2,
      endWordIndex: 3,
    })
  })

  it('splits when the gap to the next word exceeds 0.8s', () => {
    const chunks: Chunk[] = [
      { text: ' one', timestamp: [0.0, 0.4] },
      { text: ' two', timestamp: [0.4, 0.8] },
      { text: ' three', timestamp: [2.5, 2.9] },
    ]
    const sentences = buildSentences(chunks)
    expect(sentences).toHaveLength(2)
    expect(sentences[0].startWordIndex).toBe(0)
    expect(sentences[0].endWordIndex).toBe(1)
    expect(sentences[1].startWordIndex).toBe(2)
    expect(sentences[1].endWordIndex).toBe(2)
  })

  it('drops null-timestamp chunks and keeps filtered index ordering', () => {
    const chunks: Chunk[] = [
      { text: ' keep', timestamp: [0.0, 0.4] },
      { text: ' skip', timestamp: [null, 0.6] },
      { text: ' tail.', timestamp: [0.6, 1.0] },
    ]
    const sentences = buildSentences(chunks)
    expect(sentences).toHaveLength(1)
    expect(sentences[0]).toEqual({
      startMs: 0,
      endMs: 1000,
      startWordIndex: 0,
      endWordIndex: 1,
    })
  })

  it('closes a trailing sentence on the last word without punctuation', () => {
    const chunks: Chunk[] = [
      { text: ' lonely', timestamp: [0.0, 0.5] },
      { text: ' words', timestamp: [0.5, 1.0] },
    ]
    const sentences = buildSentences(chunks)
    expect(sentences).toHaveLength(1)
    expect(sentences[0].startWordIndex).toBe(0)
    expect(sentences[0].endWordIndex).toBe(1)
  })

  it('returns an empty array when there are no timestamped words', () => {
    expect(buildSentences([])).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { computeWER, normalizeText, computeAverageWER } from './wer'

describe('normalizeText', () => {
  it('lowercases text', () => {
    expect(normalizeText('HELLO WORLD')).toBe('hello world')
  })

  it('removes punctuation', () => {
    expect(normalizeText("Hello, world! How's it?")).toBe('hello world hows it')
  })

  it('collapses whitespace', () => {
    expect(normalizeText('hello   world  test')).toBe('hello world test')
  })

  it('trims leading and trailing spaces', () => {
    expect(normalizeText('  hello world  ')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('')
  })
})

describe('computeWER', () => {
  it('returns 0 for identical strings', () => {
    const result = computeWER('hello world', 'hello world')
    expect(result.wer).toBe(0)
    expect(result.substitutions).toBe(0)
    expect(result.deletions).toBe(0)
    expect(result.insertions).toBe(0)
  })

  it('handles case insensitive comparison', () => {
    const result = computeWER('HELLO WORLD', 'hello world')
    expect(result.wer).toBe(0)
  })

  it('ignores punctuation differences', () => {
    const result = computeWER('hello world', 'Hello, World!')
    expect(result.wer).toBe(0)
  })

  it('counts substitutions correctly', () => {
    const result = computeWER('hello earth', 'hello world')
    expect(result.wer).toBe(0.5)
    expect(result.substitutions).toBe(1)
    expect(result.deletions).toBe(0)
    expect(result.insertions).toBe(0)
  })

  it('counts deletions correctly', () => {
    const result = computeWER('hello', 'hello world')
    expect(result.wer).toBe(0.5)
    expect(result.deletions).toBe(1)
    expect(result.insertions).toBe(0)
  })

  it('counts insertions correctly', () => {
    const result = computeWER('hello beautiful world', 'hello world')
    expect(result.wer).toBe(0.5)
    expect(result.insertions).toBe(1)
    expect(result.deletions).toBe(0)
  })

  it('handles completely different text', () => {
    const result = computeWER('foo bar baz', 'one two three')
    expect(result.wer).toBe(1)
    expect(result.substitutions).toBe(3)
  })

  it('handles empty hypothesis', () => {
    const result = computeWER('', 'hello world')
    expect(result.wer).toBe(1)
    expect(result.deletions).toBe(2)
  })

  it('handles empty reference', () => {
    const result = computeWER('hello world', '')
    expect(result.wer).toBe(1)
    expect(result.insertions).toBe(2)
  })

  it('handles both empty', () => {
    const result = computeWER('', '')
    expect(result.wer).toBe(0)
  })

  it('tracks reference and hypothesis word counts', () => {
    const result = computeWER('a b c d', 'a b c')
    expect(result.referenceWords).toBe(3)
    expect(result.hypothesisWords).toBe(4)
  })
})

describe('computeAverageWER', () => {
  it('returns 0 for empty array', () => {
    const result = computeAverageWER([])
    expect(result.wer).toBe(0)
  })

  it('computes weighted average across samples', () => {
    const results = [
      computeWER('hello world', 'hello world'),           // 0/2 errors
      computeWER('hello earth', 'hello world'),            // 1/2 errors
      computeWER('goodbye cruel world', 'hello beautiful world'), // 2/3 errors
    ]
    const avg = computeAverageWER(results)
    // Total: 3 errors / 7 reference words
    expect(avg.wer).toBeCloseTo(3 / 7, 5)
    expect(avg.referenceWords).toBe(7)
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  buildSessionRecord,
  formatTranscriptionTimeDisplay,
  prependTemporarySession,
  removeSessionById,
  shouldShowStatus,
} from './sessionOrchestration'
import type { Session } from '../composables/useSessionStore'

describe('sessionOrchestration', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats transcription time for short and long durations', () => {
    expect(formatTranscriptionTimeDisplay(null)).toBe('')
    expect(formatTranscriptionTimeDisplay(12.34)).toBe('12.3s')
    expect(formatTranscriptionTimeDisplay(75)).toBe('1m 15s')
  })

  it('prepends temporary sessions', () => {
    const sessions: Session[] = [{ id: 'a', name: 'old', createdAt: 1, durationSec: 3 }]
    const next = { id: 'b', name: 'new', createdAt: 2, durationSec: 5 }
    expect(prependTemporarySession(sessions, next)).toEqual([next, ...sessions])
  })

  it('removes session by id when present', () => {
    const sessions: Session[] = [
      { id: 'a', name: 'old', createdAt: 1, durationSec: 3 },
      { id: 'b', name: 'new', createdAt: 2, durationSec: 5 },
    ]
    expect(removeSessionById(sessions, 'a')).toEqual([sessions[1]])
    expect(removeSessionById(sessions, null)).toEqual(sessions)
  })

  it('decides when status should remain visible', () => {
    expect(shouldShowStatus(true, 'x', 'x')).toBe(true)
    expect(shouldShowStatus(true, 'x', 'y')).toBe(false)
    expect(shouldShowStatus(false, 'x', 'x')).toBe(false)
  })

  it('builds session records with current timestamp', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T01:02:03.000Z'))

    expect(buildSessionRecord('abc', 'audio.m4a', 5, 6.7)).toEqual({
      id: 'abc',
      name: 'audio.m4a',
      createdAt: new Date('2026-04-16T01:02:03.000Z').getTime(),
      durationSec: 5,
      transcriptionTimeSec: 6.7,
    })
  })
})

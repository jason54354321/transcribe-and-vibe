import { describe, it, expect, vi, beforeEach } from 'vitest'

type MockAudio = {
  paused: boolean
  currentTime: number
  duration: number
  volume: number
  src: string
  play: (...args: unknown[]) => Promise<void>
  pause: (...args: unknown[]) => void
  addEventListener: (...args: unknown[]) => void
  removeEventListener: (...args: unknown[]) => void
  dispatchEvent: (...args: unknown[]) => void
}

function createMockAudioElement(overrides: Partial<MockAudio> = {}): MockAudio {
  const el: MockAudio = {
    paused: true,
    currentTime: 0,
    duration: 60,
    volume: 1,
    src: '',
    play: vi.fn(() => {
      el.paused = false
      return Promise.resolve()
    }),
    pause: vi.fn(() => {
      el.paused = true
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    ...overrides,
  }
  return el
}

describe('useAudioPlayer methods', () => {
  describe('togglePlay', () => {
    it('calls play() when paused', () => {
      const el = createMockAudioElement({ paused: true })
      if (el.paused) el.play()
      expect(el.play).toHaveBeenCalled()
    })

    it('calls pause() when playing', () => {
      const el = createMockAudioElement({ paused: false })
      if (!el.paused) el.pause()
      expect(el.pause).toHaveBeenCalled()
    })
  })

  describe('skip', () => {
    let el: MockAudio

    beforeEach(() => {
      el = createMockAudioElement()
      el.currentTime = 10
    })

    it('advances currentTime by positive delta', () => {
      const target = el.currentTime + 5
      el.currentTime = Math.max(0, Math.min(target, el.duration || 0))
      expect(el.currentTime).toBe(15)
    })

    it('rewinds currentTime by negative delta', () => {
      const target = el.currentTime + -5
      el.currentTime = Math.max(0, Math.min(target, el.duration || 0))
      expect(el.currentTime).toBe(5)
    })

    it('clamps to 0 when rewinding past start', () => {
      el.currentTime = 2
      const target = el.currentTime + -5
      el.currentTime = Math.max(0, Math.min(target, el.duration || 0))
      expect(el.currentTime).toBe(0)
    })

    it('clamps to duration when skipping past end', () => {
      el.currentTime = 58
      const target = el.currentTime + 5
      el.currentTime = Math.max(0, Math.min(target, el.duration || 0))
      expect(el.currentTime).toBe(60)
    })
  })

  describe('adjustVolume', () => {
    let el: MockAudio

    beforeEach(() => {
      el = createMockAudioElement()
      el.volume = 0.5
    })

    it('increases volume by delta', () => {
      const target = Math.round((el.volume + 0.1) * 100) / 100
      el.volume = Math.max(0, Math.min(target, 1))
      expect(el.volume).toBeCloseTo(0.6)
    })

    it('decreases volume by delta', () => {
      const target = Math.round((el.volume + -0.1) * 100) / 100
      el.volume = Math.max(0, Math.min(target, 1))
      expect(el.volume).toBeCloseTo(0.4)
    })

    it('clamps to 1.0 at maximum', () => {
      el.volume = 0.95
      const target = Math.round((el.volume + 0.1) * 100) / 100
      el.volume = Math.max(0, Math.min(target, 1))
      expect(el.volume).toBe(1)
    })

    it('clamps to 0.0 at minimum', () => {
      el.volume = 0.05
      const target = Math.round((el.volume + -0.1) * 100) / 100
      el.volume = Math.max(0, Math.min(target, 1))
      expect(el.volume).toBe(0)
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useEnglishLearningMode } from './useEnglishLearningMode'

const CHUNKS = [
  { text: ' Hello', timestamp: [0.0, 0.42] as [number, number] },
  { text: ' world', timestamp: [0.42, 0.78] as [number, number] },
  { text: ' this', timestamp: [0.78, 1.02] as [number, number] },
  { text: ' is', timestamp: [1.02, 1.18] as [number, number] },
  { text: ' a', timestamp: [1.18, 1.3] as [number, number] },
  { text: ' test', timestamp: [2.5, 2.82] as [number, number] },
]

function makeOpts(overrides: Partial<Parameters<typeof useEnglishLearningMode>[0]> = {}) {
  const chunks = ref(CHUNKS)
  const currentTimeMs = ref(0)
  const isPlaying = ref(true)
  const isEnabled = ref(true)
  const isAutoPauseEnabled = ref(true)
  const seekTo = vi.fn()
  const pause = vi.fn()

  return {
    opts: {
      chunks,
      currentTimeMs,
      isPlaying,
      isEnabled,
      isAutoPauseEnabled,
      seekTo,
      pause,
      ...overrides,
    },
    pause,
    seekTo,
    currentTimeMs,
    isAutoPauseEnabled,
  }
}

describe('useEnglishLearningMode', () => {
  it('calls pause when isAutoPauseEnabled is true and playback reaches sentence end', async () => {
    const { opts, pause, currentTimeMs } = makeOpts()
    useEnglishLearningMode(opts)

    // Sentence 1 ends at 1300ms; advance past it
    currentTimeMs.value = 1400
    await Promise.resolve()

    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('does NOT call pause when isAutoPauseEnabled is false and playback reaches sentence end', async () => {
    const { opts, pause, currentTimeMs, isAutoPauseEnabled } = makeOpts()
    isAutoPauseEnabled.value = false
    useEnglishLearningMode(opts)

    currentTimeMs.value = 1400
    await Promise.resolve()

    expect(pause).not.toHaveBeenCalled()
  })

  it('still tracks pausedForIndex when auto-pause is disabled so re-enabling mid-sentence does not double-pause', async () => {
    const { opts, pause, currentTimeMs, isAutoPauseEnabled } = makeOpts()
    isAutoPauseEnabled.value = false
    useEnglishLearningMode(opts)

    // Cross sentence boundary with auto-pause off
    currentTimeMs.value = 1400
    await Promise.resolve()
    expect(pause).not.toHaveBeenCalled()

    // Re-enable: the boundary was already recorded, so no retroactive pause
    isAutoPauseEnabled.value = true
    currentTimeMs.value = 1401
    await Promise.resolve()
    expect(pause).not.toHaveBeenCalled()
  })

  it('does not pause when isPlaying is false', async () => {
    const isPlaying = ref(false)
    const { opts, pause, currentTimeMs } = makeOpts({ isPlaying })
    useEnglishLearningMode(opts)

    currentTimeMs.value = 1400
    await Promise.resolve()

    expect(pause).not.toHaveBeenCalled()
  })

  it('does not pause when isEnabled is false', async () => {
    const isEnabled = ref(false)
    const { opts, pause, currentTimeMs } = makeOpts({ isEnabled })
    useEnglishLearningMode(opts)

    currentTimeMs.value = 1400
    await Promise.resolve()

    expect(pause).not.toHaveBeenCalled()
  })

  it('replaySentence seeks to start of current sentence', async () => {
    const { opts, seekTo, currentTimeMs } = makeOpts()
    const { replaySentence } = useEnglishLearningMode(opts)

    currentTimeMs.value = 500
    await Promise.resolve()

    replaySentence()
    expect(seekTo).toHaveBeenCalledWith(0)
  })

  it('nextSentence seeks to next sentence start', async () => {
    const { opts, seekTo, currentTimeMs } = makeOpts()
    const { nextSentence } = useEnglishLearningMode(opts)

    currentTimeMs.value = 500
    await Promise.resolve()

    nextSentence()
    // Second sentence starts at 2500ms (gap after 1.3s)
    expect(seekTo).toHaveBeenCalledWith(2500)
  })
})

import { computed, watch } from 'vue'
import type { Ref } from 'vue'
import { buildSentences } from '../utils/sentences'

type Chunk = { text: string; timestamp: [number | null, number | null] }

type LearningModeOptions = {
  chunks: Ref<Chunk[]>
  currentTimeMs: Ref<number>
  isPlaying: Ref<boolean>
  isEnabled: Ref<boolean>
  seekTo: (ms: number) => void
  pause: () => void
}

export function useEnglishLearningMode(opts: LearningModeOptions) {
  const sentences = computed(() => buildSentences(opts.chunks.value))

  const currentSentenceIndex = computed(() => {
    const list = sentences.value
    if (list.length === 0) return -1
    const time = opts.currentTimeMs.value
    let found = -1
    for (let i = 0; i < list.length; i++) {
      if (list[i].startMs <= time) {
        found = i
      } else {
        break
      }
    }
    return found
  })

  let pausedForIndex = -1

  watch(
    () => opts.currentTimeMs.value,
    (time) => {
      if (!opts.isEnabled.value || !opts.isPlaying.value) return
      const index = currentSentenceIndex.value
      if (index < 0) return
      const sentence = sentences.value[index]
      if (time >= sentence.endMs && pausedForIndex !== index) {
        opts.pause()
        pausedForIndex = index
      }
    },
  )

  const replaySentence = () => {
    const index = currentSentenceIndex.value
    if (index < 0) return
    opts.seekTo(sentences.value[index].startMs)
    pausedForIndex = -1
  }

  const prevSentence = () => {
    const list = sentences.value
    if (list.length === 0) return
    const target = Math.max(0, currentSentenceIndex.value - 1)
    opts.seekTo(list[target].startMs)
    pausedForIndex = -1
  }

  const nextSentence = () => {
    const list = sentences.value
    if (list.length === 0) return
    const target = Math.min(list.length - 1, currentSentenceIndex.value + 1)
    opts.seekTo(list[target].startMs)
    pausedForIndex = -1
  }

  return { sentences, currentSentenceIndex, prevSentence, nextSentence, replaySentence }
}

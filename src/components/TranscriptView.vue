<script setup lang="ts">
import { computed, watch, ref, nextTick } from 'vue'

type Chunk = { text: string; timestamp: [number | null, number | null] }

const props = defineProps<{
  chunks: Chunk[]
  currentTimeMs: number
}>()

const emit = defineEmits<{
  (e: 'seek', ms: number): void
}>()

type Word = {
  text: string
  start: number
  end: number
  startSec: number
  endSec: number
}

type Paragraph = Word[]

const paragraphs = computed(() => {
  const paras: Paragraph[] = []
  let currentParagraph: Paragraph = []
  let lastEndTime = 0

  props.chunks.forEach((chunk, index) => {
    const startSec = chunk.timestamp[0]
    const endSec = chunk.timestamp[1]
    
    if (startSec === null || endSec === null) return

    if (index > 0 && (startSec - lastEndTime > 0.8)) {
      if (currentParagraph.length > 0) {
        paras.push(currentParagraph)
      }
      currentParagraph = []
    }

    currentParagraph.push({
      text: chunk.text,
      start: Math.round(startSec * 1000),
      end: Math.round(endSec * 1000),
      startSec,
      endSec
    })

    lastEndTime = endSec
  })

  if (currentParagraph.length > 0) {
    paras.push(currentParagraph)
  }

  return paras
})

const flatWords = computed(() => paragraphs.value.flat())

const metaInfoText = computed(() => {
  const wordCount = flatWords.value.length
  const durationSec = props.chunks.length > 0 && props.chunks[props.chunks.length - 1].timestamp[1] !== null 
    ? props.chunks[props.chunks.length - 1].timestamp[1] 
    : 0
  const durationStr = durationSec ? `${Math.floor(durationSec / 60)}m ${Math.floor(durationSec % 60)}s` : ''
  return `${wordCount} words${durationStr ? ' · ' + durationStr : ''}`
})

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const paragraphOffsets = computed(() => {
  const offsets: number[] = []
  let cumulative = 0
  for (const para of paragraphs.value) {
    offsets.push(cumulative)
    cumulative += para.length
  }
  return offsets
})

const activeIndex = ref(-1)

watch(() => props.currentTimeMs, (time) => {
  const words = flatWords.value
  if (words.length === 0) return

  let low = 0
  let high = words.length - 1
  let found = -1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const word = words[mid]

    if (time >= word.start && time < word.end) {
      found = mid
      break
    } else if (time < word.start) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  // In a gap between words — keep highlighting the previous word
  if (found === -1 && high >= 0 && time >= words[high].end) {
    found = high
  }

  activeIndex.value = found
})

const handleContentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const span = target.closest('.word') as HTMLElement | null
  if (span && span.dataset.start) {
    emit('seek', parseInt(span.dataset.start, 10))
  }
}
</script>

<template>
  <div id="transcript-container" class="transcript-container">
    <div id="meta-info" class="meta-info">{{ metaInfoText }}</div>
    <div id="transcript-content" class="transcript-content" @click="handleContentClick">
      <p v-for="(para, pIndex) in paragraphs" :key="pIndex">
        <span 
          v-for="(word, wIndex) in para" 
          :key="`${pIndex}-${wIndex}`"
          class="word"
          :class="{ active: paragraphOffsets[pIndex] + wIndex === activeIndex }"
          :data-start="word.start"
          :data-end="word.end"
          :title="`${formatTime(word.startSec)} - ${formatTime(word.endSec)}`"
        >{{ word.text }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.transcript-container {
  margin-top: calc(var(--spacing-unit) * 2);
}

.meta-info {
  font-size: 13px;
  color: var(--secondary-text);
  margin-bottom: var(--spacing-unit);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.transcript-content {
  font-size: 18px;
  line-height: 1.8;
  color: #333;
}

.transcript-content p {
  margin-bottom: var(--spacing-unit);
}

.word {
  cursor: pointer;
  padding: 2px 0;
  border-radius: 3px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.word:hover {
  background-color: #f0f0f0;
  color: #000;
}

.word.active {
  background-color: var(--accent-color);
  color: white;
  box-shadow: 0 0 0 2px var(--accent-color);
}

@media (max-width: 600px) {
  .transcript-content {
    font-size: 16px;
  }
}
</style>

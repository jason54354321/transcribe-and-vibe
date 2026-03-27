<script setup lang="ts">
import { watch } from 'vue'
import { useAudioPlayer } from '../composables/useAudioPlayer'

const props = defineProps<{
  src: string
}>()

const { audioRef, currentTimeMs, setSource, seekTo } = useAudioPlayer()

watch(() => props.src, (newSrc) => {
  if (newSrc) {
    setSource(newSrc)
  }
})

defineExpose({
  currentTimeMs,
  seekTo
})
</script>

<template>
  <div id="audio-container" class="audio-container">
    <audio id="audio-player" ref="audioRef" controls></audio>
  </div>
</template>

<style scoped>
.audio-container {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: var(--spacing-unit) 0;
  border-bottom: 1px solid transparent;
  z-index: 100;
  transition: border-color 0.2s;
}

.audio-container.stuck {
  border-bottom-color: var(--border-color);
}

audio {
  width: 100%;
  border-radius: 40px;
  outline: none;
}
</style>

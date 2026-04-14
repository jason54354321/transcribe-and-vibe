<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useAudioPlayer } from '../composables/useAudioPlayer'

const props = defineProps<{
  src: string
}>()

const { audioRef, currentTimeMs, volume, setSource, seekTo, togglePlay, skip, adjustVolume } = useAudioPlayer()

watchEffect(() => {
  if (props.src && audioRef.value) {
    audioRef.value.src = props.src
  }
})

const showVolumeIndicator = ref(false)
let volumeTimeout: ReturnType<typeof setTimeout> | undefined

const onVolumeChange = () => {
  showVolumeIndicator.value = true
  clearTimeout(volumeTimeout)
  volumeTimeout = setTimeout(() => {
    showVolumeIndicator.value = false
  }, 1000)
}

const exposedAdjustVolume = (delta: number) => {
  adjustVolume(delta)
  onVolumeChange()
}

defineExpose({
  currentTimeMs,
  volume,
  seekTo,
  togglePlay,
  skip,
  adjustVolume: exposedAdjustVolume,
})
</script>

<template>
  <div id="audio-container" class="audio-container">
    <audio id="audio-player" ref="audioRef" controls></audio>
    <Transition name="volume-fade">
      <div v-if="showVolumeIndicator" class="volume-indicator">
        🔊 {{ Math.round(volume * 100) }}%
      </div>
    </Transition>
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

.volume-indicator {
  position: absolute;
  top: 50%;
  right: calc(var(--spacing-unit) * 0.75);
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: var(--radius);
  pointer-events: none;
  white-space: nowrap;
}

.volume-fade-enter-active,
.volume-fade-leave-active {
  transition: opacity 0.2s;
}

.volume-fade-enter-from,
.volume-fade-leave-to {
  opacity: 0;
}
</style>

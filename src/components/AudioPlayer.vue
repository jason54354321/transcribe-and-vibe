<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useAudioPlayer } from '../composables/useAudioPlayer'

const props = defineProps<{
  src: string
}>()

const { audioRef, currentTimeMs, volume, isPlaying, seekTo, play, pause, togglePlay, skip, adjustVolume } =
  useAudioPlayer()

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
  isPlaying,
  seekTo,
  play,
  pause,
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
  background: var(--sticky-bg);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  padding: 12px 0;
  margin: 0 calc(var(--spacing-unit) * -1);
  padding-left: var(--spacing-unit);
  padding-right: var(--spacing-unit);
  border-bottom: 1px solid transparent;
  z-index: 100;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.audio-container.stuck {
  border-bottom-color: var(--border-color);
  box-shadow: var(--shadow-sm);
}

audio {
  width: 100%;
  height: 40px;
  border-radius: var(--radius-pill);
  outline: none;
}

.volume-indicator {
  position: absolute;
  top: 50%;
  right: calc(var(--spacing-unit) + 6px);
  transform: translateY(-50%);
  background: var(--text-color);
  color: var(--bg-color);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  padding: 5px 11px;
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-md);
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

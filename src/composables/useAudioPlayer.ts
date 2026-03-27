import { ref, watchEffect, onUnmounted } from 'vue'

export function useAudioPlayer() {
  const audioRef = ref<HTMLAudioElement | null>(null)
  const currentTimeMs = ref(0)
  
  const updateTime = () => {
    if (audioRef.value) {
      currentTimeMs.value = Math.round(audioRef.value.currentTime * 1000)
    }
  }

  watchEffect((onCleanup) => {
    const el = audioRef.value
    if (el) {
      el.addEventListener('timeupdate', updateTime)
      onCleanup(() => {
        el.removeEventListener('timeupdate', updateTime)
      })
    }
  })

  const setSource = (url: string) => {
    if (audioRef.value) {
      audioRef.value.src = url
    }
  }

  const seekTo = (ms: number) => {
    if (audioRef.value) {
      const timeInSeconds = ms / 1000
      audioRef.value.currentTime = timeInSeconds
      audioRef.value.play().catch(() => {
        // Ignore play interruption errors
      })
    }
  }

  return {
    audioRef,
    currentTimeMs,
    setSource,
    seekTo
  }
}

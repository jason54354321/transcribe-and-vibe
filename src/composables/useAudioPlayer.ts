import { ref, watchEffect } from 'vue'

export function useAudioPlayer() {
  const audioRef = ref<HTMLAudioElement | null>(null)
  const currentTimeMs = ref(0)
  const volume = ref(1)

  const updateTime = () => {
    if (audioRef.value) {
      currentTimeMs.value = Math.round(audioRef.value.currentTime * 1000)
    }
  }

  const syncVolume = () => {
    if (audioRef.value) {
      volume.value = Math.round(audioRef.value.volume * 100) / 100
    }
  }

  watchEffect((onCleanup) => {
    const el = audioRef.value
    if (el) {
      el.addEventListener('timeupdate', updateTime)
      el.addEventListener('volumechange', syncVolume)
      volume.value = Math.round(el.volume * 100) / 100
      onCleanup(() => {
        el.removeEventListener('timeupdate', updateTime)
        el.removeEventListener('volumechange', syncVolume)
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

  const togglePlay = () => {
    const el = audioRef.value
    if (!el) return
    if (el.paused) {
      el.play().catch(() => {
        // Ignore play interruption errors
      })
    } else {
      el.pause()
    }
  }

  const skip = (deltaSec: number) => {
    const el = audioRef.value
    if (!el) return
    const target = el.currentTime + deltaSec
    const dur = Number.isFinite(el.duration) ? el.duration : Infinity
    el.currentTime = Math.max(0, Math.min(target, dur))
  }

  const adjustVolume = (delta: number) => {
    const el = audioRef.value
    if (!el) return
    const target = Math.round((el.volume + delta) * 100) / 100
    el.volume = Math.max(0, Math.min(target, 1))
  }

  return {
    audioRef,
    currentTimeMs,
    volume,
    setSource,
    seekTo,
    togglePlay,
    skip,
    adjustVolume,
  }
}

import { computed, onMounted, onUnmounted, ref } from 'vue'

export function useStickyAudio() {
  const audioUrl = ref('')
  const isAudioStuck = ref(false)
  const hasAudioSource = computed(() => audioUrl.value !== '')

  const revokeAudioUrl = () => {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = ''
    }
  }

  const handleScroll = () => {
    isAudioStuck.value = window.scrollY > 0
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    revokeAudioUrl()
  })

  return {
    audioUrl,
    isAudioStuck,
    hasAudioSource,
    revokeAudioUrl,
  }
}

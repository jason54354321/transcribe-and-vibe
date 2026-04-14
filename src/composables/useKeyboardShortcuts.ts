import { onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

type AudioPlayerApi = {
  togglePlay: () => void
  skip: (deltaSec: number) => void
  adjustVolume: (delta: number) => void
}

const INTERACTIVE_SELECTORS = 'input, textarea, select, button, [contenteditable]'

export function useKeyboardShortcuts(api: AudioPlayerApi, hasSource: Ref<boolean>) {
  const handleKeydown = (e: KeyboardEvent) => {
    if (!hasSource.value) return
    if (document.activeElement?.matches(INTERACTIVE_SELECTORS)) return

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        api.togglePlay()
        break
      case 'ArrowLeft':
        e.preventDefault()
        api.skip(-5)
        break
      case 'ArrowRight':
        e.preventDefault()
        api.skip(5)
        break
      case 'ArrowUp':
        e.preventDefault()
        api.adjustVolume(0.1)
        break
      case 'ArrowDown':
        e.preventDefault()
        api.adjustVolume(-0.1)
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}

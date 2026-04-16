import { ref } from 'vue'

export function useTheme() {
  const currentTheme = ref('light')

  const applyTheme = (theme: string) => {
    currentTheme.value = theme
    document.documentElement.setAttribute('data-theme', theme)
  }

  const toggleTheme = () => {
    const nextTheme = currentTheme.value === 'light' ? 'dark' : 'light'
    applyTheme(nextTheme)
    localStorage.setItem('vibe-theme', nextTheme)
  }

  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('vibe-theme')
    if (savedTheme) {
      applyTheme(savedTheme)
      return
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark')
    }
  }

  return {
    currentTheme,
    toggleTheme,
    initializeTheme,
  }
}

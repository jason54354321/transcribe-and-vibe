import { expect, test } from '@playwright/test'

import { setupMockBackend, uploadTestAudio } from '../fixtures'

test.describe('Vibe Transcription - Auto-scroll during playback', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockBackend(page)
    await page.goto('/')
    await uploadTestAudio(page)
    await expect(page.locator('#transcript-container')).toBeVisible()
  })

  test('scrolls the active word into view while playing', async ({ page }) => {
    const scrolled = await page.evaluate(async () => {
      const calls: string[] = []
      const original = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element) {
        if (this.classList.contains('word')) {
          calls.push(this.textContent ?? '')
        }
        return original.call(this, { block: 'center' })
      }

      const audio = document.getElementById('audio-player') as HTMLAudioElement
      // Force a "playing" state the auto-scroll guard checks via audio.paused
      Object.defineProperty(audio, 'paused', { value: false, configurable: true })
      audio.dispatchEvent(new Event('play'))

      audio.currentTime = 3.1 // within "transcription" (3.0 - 3.62)
      audio.dispatchEvent(new Event('timeupdate'))

      await new Promise((resolve) => setTimeout(resolve, 50))
      return calls
    })

    expect(scrolled.length).toBeGreaterThan(0)
    expect(scrolled.join(' ')).toContain('transcription')
  })

  test('does not auto-scroll while paused', async ({ page }) => {
    const scrolled = await page.evaluate(async () => {
      const calls: string[] = []
      const original = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element) {
        if (this.classList.contains('word')) calls.push(this.textContent ?? '')
        return original.call(this, { block: 'center' })
      }

      const audio = document.getElementById('audio-player') as HTMLAudioElement
      Object.defineProperty(audio, 'paused', { value: true, configurable: true })
      audio.dispatchEvent(new Event('pause'))

      audio.currentTime = 3.1
      audio.dispatchEvent(new Event('timeupdate'))

      await new Promise((resolve) => setTimeout(resolve, 50))
      return calls
    })

    expect(scrolled.length).toBe(0)
  })
})

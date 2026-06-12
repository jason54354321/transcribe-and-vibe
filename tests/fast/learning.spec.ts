import { expect, test } from '@playwright/test'

import { setupMockBackend, uploadTestAudio } from '../fixtures'

test.describe('Vibe Transcription - English learning mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockBackend(page)
    await page.goto('/')
    await uploadTestAudio(page)
    await expect(page.locator('#transcript-container')).toBeVisible()
  })

  test('enabling learning mode checks the toggle and shows extra hints', async ({ page }) => {
    await page.locator('#learning-toggle').check()
    await expect(page.locator('#learning-toggle')).toBeChecked()

    const hints = page.locator('#keyboard-hints')
    await expect(hints).toContainText('prev/next sentence')
    await expect(hints).toContainText('replay')
  })

  test("pressing 'd' then 's' moves audio to a sentence start", async ({ page }) => {
    await page.locator('#learning-toggle').check()

    await page.evaluate(() => {
      // Blur the checkbox so the form-element shortcut guard does not swallow keystrokes.
      ;(document.activeElement as HTMLElement | null)?.blur()
      const audio = document.getElementById('audio-player') as HTMLAudioElement
      audio.currentTime = 0
      audio.dispatchEvent(new Event('timeupdate'))
    })

    await page.keyboard.press('KeyD')
    const afterNext = await page.evaluate(
      () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
    )
    // MOCK_CHUNKS second sentence starts at 2.5s (gap split after "a" ends 1.3)
    expect(afterNext).toBeCloseTo(2.5, 2)

    // Reflect the new playback position so the current sentence index advances.
    await page.evaluate(() => {
      const audio = document.getElementById('audio-player') as HTMLAudioElement
      audio.dispatchEvent(new Event('timeupdate'))
    })

    await page.keyboard.press('KeyS')
    const afterReplay = await page.evaluate(
      () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
    )
    expect(afterReplay).toBeCloseTo(2.5, 2)
  })

  test('auto-pauses when playback reaches the end of the current sentence', async ({ page }) => {
    await page.locator('#learning-toggle').check()

    const pauseCalled = await page.evaluate(async () => {
      const audio = document.getElementById('audio-player') as HTMLAudioElement
      let paused = false
      const origPause = audio.pause.bind(audio)
      audio.pause = () => {
        paused = true
        return origPause()
      }

      Object.defineProperty(audio, 'paused', { value: false, configurable: true })
      audio.dispatchEvent(new Event('play'))

      // First sentence ends at 1.3s; advance just past it.
      audio.currentTime = 1.4
      audio.dispatchEvent(new Event('timeupdate'))

      await new Promise((resolve) => setTimeout(resolve, 50))
      return paused
    })

    expect(pauseCalled).toBe(true)
  })

  test("does not fire sentence navigation when learning mode is off", async ({ page }) => {
    await page.evaluate(() => {
      const audio = document.getElementById('audio-player') as HTMLAudioElement
      audio.currentTime = 0
      audio.dispatchEvent(new Event('timeupdate'))
    })

    await page.keyboard.press('KeyD')
    const time = await page.evaluate(
      () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
    )
    expect(time).toBe(0)
  })
})

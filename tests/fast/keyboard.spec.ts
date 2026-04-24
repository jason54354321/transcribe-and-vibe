import { expect, test } from '@playwright/test'

import { setupMockBackend, uploadTestAudio } from '../fixtures'

test.describe('Vibe Transcription - Fast Loop', () => {
  test.describe('keyboard shortcuts', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockBackend(page)
      await page.goto('/')
      await uploadTestAudio(page)
      await expect(page.locator('#transcript-container')).toBeVisible()
    })

    test('Space toggles play/pause', async ({ page }) => {
      const calls = await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement
        const log: string[] = []
        const origPlay = audio.play.bind(audio)
        const origPause = audio.pause.bind(audio)
        audio.play = () => {
          log.push('play')
          return origPlay()
        }
        audio.pause = () => {
          log.push('pause')
          return origPause()
        }
        ;(window as unknown as Record<string, string[]>).__playLog = log
        return log
      })

      await page.keyboard.press('Space')
      await page.keyboard.press('Space')

      const log = await page.evaluate(
        () => (window as unknown as Record<string, string[]>).__playLog,
      )
      expect(log).toContain('play')
      expect(log.length).toBeGreaterThanOrEqual(2)
    })

    test('ArrowRight seeks forward 5 seconds', async ({ page }) => {
      const before = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
      )

      await page.keyboard.press('ArrowRight')

      const after = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
      )
      expect(after).toBeGreaterThan(before)
    })

    test('ArrowLeft seeks backward', async ({ page }) => {
      await page.keyboard.press('ArrowRight')
      const before = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
      )
      expect(before).toBeGreaterThan(0)

      await page.keyboard.press('ArrowLeft')
      const after = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
      )
      expect(after).toBeLessThan(before)
    })

    test('ArrowLeft clamps to 0', async ({ page }) => {
      await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement
        Object.defineProperty(audio, 'duration', { value: 60, writable: true, configurable: true })
        audio.currentTime = 2
      })

      await page.keyboard.press('ArrowLeft')

      const time = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
      )
      expect(time).toBe(0)
    })

    test('ArrowUp increases volume', async ({ page }) => {
      await page.evaluate(() => {
        ;(document.getElementById('audio-player') as HTMLAudioElement).volume = 0.5
      })

      await page.keyboard.press('ArrowUp')

      const vol = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).volume,
      )
      expect(vol).toBeCloseTo(0.6, 2)
    })

    test('ArrowDown decreases volume', async ({ page }) => {
      await page.evaluate(() => {
        ;(document.getElementById('audio-player') as HTMLAudioElement).volume = 0.5
      })

      await page.keyboard.press('ArrowDown')

      const vol = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).volume,
      )
      expect(vol).toBeCloseTo(0.4, 2)
    })

    test('volume indicator appears on volume change', async ({ page }) => {
      await page.evaluate(() => {
        ;(document.getElementById('audio-player') as HTMLAudioElement).volume = 0.5
      })

      await page.keyboard.press('ArrowUp')

      await expect(page.locator('.volume-indicator')).toBeVisible()
      await expect(page.locator('.volume-indicator')).toContainText('60%')
    })

    test('Space is ignored when focus is on input', async ({ page }) => {
      await page.evaluate(() => {
        const input = document.createElement('input')
        input.id = 'test-input'
        document.body.appendChild(input)
      })

      await page.locator('#test-input').focus()
      const wasPaused = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).paused,
      )

      await page.keyboard.press('Space')

      const stillPaused = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).paused,
      )
      expect(stillPaused).toBe(wasPaused)
    })
  })
})

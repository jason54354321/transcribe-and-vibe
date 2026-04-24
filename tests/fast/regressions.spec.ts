import { expect, test } from '@playwright/test'

import { setupMockBackend, uploadTestAudio } from '../fixtures'

test.describe('Vibe Transcription - Fast Loop', () => {
  test.describe('Oracle bug regression tests', () => {
    test('C1: object URL is revoked on re-upload', async ({ page }) => {
      await setupMockBackend(page)
      await page.goto('/')

      await page.evaluate(() => {
        ;(window as any).__revokedUrls = []
        const original = URL.revokeObjectURL.bind(URL)
        URL.revokeObjectURL = function (url: string) {
          ;(window as any).__revokedUrls.push(url)
          return original(url)
        }
      })

      await uploadTestAudio(page)
      await expect(page.locator('#transcript-container')).toBeVisible()

      const firstUrl = await page.locator('#audio-player').getAttribute('src')
      expect(firstUrl).toBeTruthy()

      await uploadTestAudio(page)
      await page.waitForFunction((oldUrl: string) => {
        const audio = document.getElementById('audio-player')
        return audio?.getAttribute('src') !== oldUrl
      }, firstUrl!)

      const revokedUrls: string[] = await page.evaluate(() => (window as any).__revokedUrls)
      expect(revokedUrls).toContain(firstUrl)
    })

    test('C2: backend error shows error and preserves drop zone', async ({ page }) => {
      await setupMockBackend(page, { error: 'Backend transcription failed' })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#error-container')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('#error-container')).toContainText('Backend transcription failed')
      await expect(page.locator('#drop-zone')).toBeVisible()
    })

    test('C4: null timestamps in chunks are skipped gracefully', async ({ page }) => {
      await setupMockBackend(page, {
        chunks: [
          { text: ' Hello', timestamp: [0.0, 0.42] },
          { text: ' world', timestamp: [0.42, null] },
          { text: ' test', timestamp: [null, 1.5] },
          { text: ' good', timestamp: [1.5, 2.0] },
        ],
        text: ' Hello world test good',
      })
      await page.goto('/')
      await uploadTestAudio(page)

      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('.word')).toHaveCount(2)
    })
  })
})

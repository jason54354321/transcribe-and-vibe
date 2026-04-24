import { expect, test } from '@playwright/test'

import { setupMockBackend, uploadTestAudio } from '../fixtures'

test.describe('Vibe Transcription - Fast Loop', () => {
  test.describe('highlight preference', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockBackend(page)
      await page.goto('/')
    })

    test('toggle word highlight turns off active class', async ({ page }) => {
      await uploadTestAudio(page)
      await expect(page.locator('#transcript-container')).toBeVisible()

      await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement
        Object.defineProperty(audio, 'currentTime', {
          value: 0.5,
          writable: true,
          configurable: true,
        })
        audio.dispatchEvent(new Event('timeupdate'))
      })

      await expect(page.locator('.word.active')).toHaveCount(1)

      await page
        .locator('label', { hasText: 'Word highlight' })
        .locator('input[type="checkbox"]')
        .uncheck()

      await expect(page.locator('.word.active')).toHaveCount(0)

      await page
        .locator('label', { hasText: 'Word highlight' })
        .locator('input[type="checkbox"]')
        .check()

      await expect(page.locator('.word.active')).toHaveCount(1)
    })

    test('preference persists after reload', async ({ page }) => {
      await page
        .locator('label', { hasText: 'Word highlight' })
        .locator('input[type="checkbox"]')
        .uncheck()

      await page.reload()

      const toggle = page
        .locator('label', { hasText: 'Word highlight' })
        .locator('input[type="checkbox"]')
      await expect(toggle).not.toBeChecked()
    })
  })

  test.describe('theme switching', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockBackend(page)
      await page.goto('/')
    })

    test('toggle theme changes data-theme attribute and persists', async ({ page }) => {
      const html = page.locator('html')

      await page.evaluate(() => {
        document.documentElement.removeAttribute('data-theme')
        localStorage.removeItem('vibe-theme')
      })

      await page
        .locator('label', { hasText: 'Dark mode' })
        .locator('input[type="checkbox"]')
        .check()
      await expect(html).toHaveAttribute('data-theme', 'dark')

      await page.reload()
      const htmlAfterReload = page.locator('html')
      await expect(htmlAfterReload).toHaveAttribute('data-theme', 'dark')
      const toggle = page
        .locator('label', { hasText: 'Dark mode' })
        .locator('input[type="checkbox"]')
      await expect(toggle).toBeChecked()

      await toggle.uncheck()
      await expect(htmlAfterReload).toHaveAttribute('data-theme', 'light')

      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    })

    test('drop zone button keeps readable contrast in dark mode', async ({ page }) => {
      await page.locator('#theme-toggle').check()

      const button = page.locator('#drop-zone .btn')
      await expect(button).toHaveCSS('background-color', 'rgb(43, 47, 49)')
      await expect(button).toHaveCSS('color', 'rgb(216, 212, 207)')
    })
  })
})

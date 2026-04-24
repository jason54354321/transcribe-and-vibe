import { expect, test } from '@playwright/test'

import {
  MOCK_DTYPE,
  MOCK_ENGINE,
  MOCK_EXECUTION_BACKEND,
  MOCK_BACKEND_INFO,
  MOCK_MODEL_ID,
  setupMockBackend,
  setupUnavailableBackend,
  uploadTestAudio,
} from '../fixtures'

test.describe('Vibe Transcription - Fast Loop', () => {
  test.describe('custom mock backend', () => {
    test('progress UI during transcription', async ({ page }) => {
      await setupMockBackend(page, { delay: 2000 })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#status-container')).toBeVisible()
      await expect(page.locator('#status-text')).not.toHaveText('')
      await expect(page.locator('#transcript-container')).toBeVisible()
    })

    test('backend error shows error message', async ({ page }) => {
      await setupMockBackend(page, { error: 'Backend transcription failed' })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#error-container')).toBeVisible()
      await expect(page.locator('#error-container')).toContainText('Backend transcription failed')
      await expect(page.locator('#drop-zone')).toBeVisible()
    })

    test('runtime info shows architecture, model, and execution backend', async ({ page }) => {
      await setupMockBackend(page, { delay: 500 })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#runtime-info')).toBeVisible()
      await expect(page.locator('#runtime-architecture')).toContainText(
        MOCK_BACKEND_INFO.hardware.toUpperCase(),
      )
      await expect(page.locator('#runtime-model')).toContainText(MOCK_MODEL_ID)
      await expect(page.locator('#runtime-execution-backend')).toContainText(
        MOCK_EXECUTION_BACKEND.toUpperCase(),
      )
      await expect(page.locator('#runtime-execution-backend')).toContainText(MOCK_ENGINE)
      await expect(page.locator('#runtime-execution-backend')).toContainText(MOCK_DTYPE)
    })

    test('backend flow does not show worker download progress UI', async ({ page }) => {
      await setupMockBackend(page, { delay: 300 })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#download-progress')).toBeHidden()
    })

    test('all progress UI clears after completion', async ({ page }) => {
      await setupMockBackend(page, { delay: 100 })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('#download-progress')).toBeHidden()
    })

    test('transcription progress bar shows during multi-segment transcription', async ({
      page,
    }) => {
      await setupMockBackend(page, { totalChunks: 5, delay: 3000 })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('.determinate-track')).toBeVisible({ timeout: 5000 })

      const progressInfo = page.locator('.progress-info')
      await expect(progressInfo).toBeVisible()
      await expect(progressInfo).toContainText(/\d+ \/ 5 chunks/)

      const subStatus = page.locator('.sub-status')
      await expect(subStatus).toBeVisible()

      await expect(page.locator('#transcript-container')).toBeVisible({ timeout: 10000 })

      await expect(page.locator('.determinate-track')).toBeHidden()
    })

    test('backend unavailable shows actionable blocking error', async ({ page }) => {
      await setupUnavailableBackend(page)
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#error-container')).toBeVisible()
      await expect(page.locator('#error-container')).toContainText(
        'Backend is unreachable. Start the backend service, then try transcription again.',
      )
    })
  })
})

import { expect, test } from '@playwright/test'

import { MOCK_DTYPE, MOCK_MODEL_ID, setupMockWorker, uploadTestAudio } from '../fixtures'

test.describe('Vibe Transcription - Fast Loop', () => {
  test.describe('custom mock worker', () => {
    test('progress UI during transcription', async ({ page }) => {
      await setupMockWorker(page, { delay: 2000 })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#status-container')).toBeVisible()
      await expect(page.locator('#status-text')).not.toHaveText('')
      await expect(page.locator('#transcript-container')).toBeVisible()
    })

    test('worker error shows error message', async ({ page }) => {
      await setupMockWorker(page, { error: 'Model failed to load' })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#error-container')).toBeVisible()
      await expect(page.locator('#error-container')).toContainText('Model failed to load')
      await expect(page.locator('#drop-zone')).toBeVisible()
    })

    test('model info badge shows model and dtype', async ({ page }) => {
      await setupMockWorker(page, { delay: 500 })
      await page.goto('/')

      await uploadTestAudio(page)

      const badge = page.locator('#model-badge')
      await expect(badge).toBeVisible()

      const expectedName = MOCK_MODEL_ID.split('/').pop()
      await expect(badge).toContainText(expectedName!)
      await expect(badge).toContainText(MOCK_DTYPE)
    })

    test('download progress bar appears during model download', async ({ page }) => {
      await setupMockWorker(page, { downloadDelay: 1000 })
      await page.goto('/')

      await uploadTestAudio(page)

      const dlProgress = page.locator('#download-progress')
      await expect(dlProgress).toBeVisible({ timeout: 3000 })
      await expect(dlProgress).toContainText('encoder_model_quantized.onnx')
      await expect(dlProgress).toContainText('MB')
    })

    test('download progress clears after completion', async ({ page }) => {
      await setupMockWorker(page, { downloadDelay: 200 })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('#download-progress')).toBeHidden()
    })

    test('all progress UI clears after completion', async ({ page }) => {
      await setupMockWorker(page, { downloadDelay: 100 })
      await page.goto('/')

      await uploadTestAudio(page)

      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('#download-progress')).toBeHidden()
    })

    test('transcription progress bar shows during multi-segment transcription', async ({
      page,
    }) => {
      await setupMockWorker(page, { totalChunks: 5, delay: 3000 })
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
  })
})

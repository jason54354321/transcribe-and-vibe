import { expect, test } from '@playwright/test'

import {
  setupMockWorker,
  setupMockWorkerWithBackendAvailable,
  transcribeAndWaitForSession,
} from '../fixtures'

test.describe('Vibe Transcription - Fast Loop', () => {
  test.describe('session persistence', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockWorker(page)
      await page.goto('/')
    })

    test('sidebar visible with empty state', async ({ page }) => {
      await expect(page.locator('#session-sidebar')).toBeVisible()
      await expect(page.locator('.empty-state')).toContainText('No sessions yet')
    })

    test('session appears in sidebar after transcription', async ({ page }) => {
      await transcribeAndWaitForSession(page)

      await expect(page.locator('.session-name')).toContainText('test_vibe.m4a')
      await expect(page.locator('.session-item.is-active')).toHaveCount(1)
    })

    test('session persists after page reload', async ({ page }) => {
      await transcribeAndWaitForSession(page)

      await page.reload()

      await expect(page.locator('.session-item')).toHaveCount(1)
      await expect(page.locator('.session-name')).toContainText('test_vibe.m4a')
    })

    test('clicking session restores transcript', async ({ page }) => {
      await transcribeAndWaitForSession(page)

      await page.locator('.new-btn').click()
      await expect(page.locator('#drop-zone')).toBeVisible()
      await expect(page.locator('#transcript-container')).toBeHidden()

      await page.locator('.session-item').click()
      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('.word')).toHaveCount(8)
    })

    test('new session button resets to DropZone', async ({ page }) => {
      await transcribeAndWaitForSession(page)

      await page.locator('.new-btn').click()
      await expect(page.locator('#drop-zone')).toBeVisible()
      await expect(page.locator('#transcript-container')).toBeHidden()
      await expect(page.locator('.session-item.is-active')).toHaveCount(0)
    })

    test('delete session removes it from sidebar', async ({ page }) => {
      await transcribeAndWaitForSession(page)

      page.on('dialog', (dialog) => dialog.accept())

      await page.locator('.session-item').hover()
      await page.locator('.delete-btn').click()

      await expect(page.locator('.session-item')).toHaveCount(0)
      await expect(page.locator('.empty-state')).toBeVisible()
      await expect(page.locator('#drop-zone')).toBeVisible()
    })

    test('switching mode after completed transcription preserves displayed transcript', async ({
      page,
    }) => {
      await setupMockWorkerWithBackendAvailable(page)
      await page.goto('/')

      await expect(page.locator('#backend-toggle')).toBeChecked()
      await page.locator('#backend-toggle').uncheck()

      await transcribeAndWaitForSession(page)
      await expect(page.locator('.word')).toHaveCount(8)

      await page.locator('#backend-toggle').check()
      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('.word')).toHaveCount(8)
    })

    test('switching mode after restoring a saved session preserves displayed transcript', async ({
      page,
    }) => {
      await setupMockWorkerWithBackendAvailable(page)
      await page.goto('/')

      await expect(page.locator('#backend-toggle')).toBeChecked()
      await page.locator('#backend-toggle').uncheck()

      await transcribeAndWaitForSession(page)
      await page.locator('.new-btn').click()
      await page.locator('.session-item').click()
      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('.word')).toHaveCount(8)

      await page.locator('#backend-toggle').check()
      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('.word')).toHaveCount(8)
    })
  })
})

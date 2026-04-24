// Slow E2E test — uses the real backend runtime.

import { test, expect } from '@playwright/test'

const FIXTURE = 'tests/fixtures/test_vibe.m4a'

test('Vibe Transcription - Slow E2E: full transcription with real backend', async ({ page }) => {
  // Capture console errors and page errors for debugging
  const consoleErrors: string[] = []
  const pageErrors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
      consoleErrors.push(msg.text())
    }
  })
  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
  })

  // 1. Navigate — NO route interception, real backend request path
  await page.goto('/')

  // 2. Upload test audio via file input
  const fileInput = page.locator('#file-input')
  await fileInput.setInputFiles(FIXTURE)

  // 3. Wait for either transcript OR error (don't blindly wait 5min on failure)
  const transcriptVisible = page.locator('#transcript-container')
  const errorVisible = page.locator('#error-container')

  const result = await Promise.race([
    transcriptVisible
      .waitFor({ state: 'visible', timeout: 300_000 })
      .then(() => 'transcript' as const),
    errorVisible.waitFor({ state: 'visible', timeout: 300_000 }).then(() => 'error' as const),
  ])

  // If error appeared, fail immediately with the error text
  if (result === 'error') {
    const errorText = await errorVisible.textContent()
    const allErrors = [
      `UI error: ${errorText}`,
      ...consoleErrors.map((e) => `console.error: ${e}`),
      ...pageErrors.map((e) => `page error: ${e}`),
    ].join('\n')
    test.fail(true, `Transcription failed:\n${allErrors}`)
    return
  }

  // 4. Assertions — transcript appeared
  // - At least 1 word span exists
  const words = page.locator('.word')
  await expect(words.first()).toBeVisible()
  const count = await words.count()
  expect(count).toBeGreaterThan(0)

  // - Meta info contains "words"
  await expect(page.locator('#meta-info')).toContainText('words')

  // - Word spans have valid numeric data-start and data-end
  const firstWord = words.first()
  const start = await firstWord.getAttribute('data-start')
  const end = await firstWord.getAttribute('data-end')
  expect(Number(start)).toBeGreaterThanOrEqual(0)
  expect(Number(end)).toBeGreaterThan(0)
  expect(Number(end)).toBeGreaterThan(Number(start))

  // 5. Verify no console errors during the entire flow
  expect(consoleErrors).toEqual([])
  expect(pageErrors).toEqual([])
})

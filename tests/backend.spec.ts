// Prereq: cd backend && .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
// Run:    npx playwright test --project=backend

import { test, expect } from '@playwright/test'
import path from 'path'

const BACKEND_URL = `http://127.0.0.1:${process.env.BACKEND_PORT || '8000'}`
const FIXTURE = path.join(__dirname, 'fixtures', 'test_vibe.m4a')

test.beforeAll(async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/info`)
    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  } catch {
    test.skip(true, 'Backend not running — start with: cd backend && .venv/bin/uvicorn main:app')
  }
})

async function gotoAndUpload(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForTimeout(2000)
  await expect(page.locator('#backend-toggle')).toBeChecked()
  await page.locator('#file-input').setInputFiles(FIXTURE)
}

test.describe('Backend GPU Transcription', () => {
  test.describe.configure({ mode: 'serial' })

  test('backend auto-detected and toggle enabled', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    const toggle = page.locator('#backend-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toBeChecked()

    const toggleLabel = page.locator('label', { has: toggle })
    await expect(toggleLabel).toContainText(/Apple|NVIDIA|GPU/i)
  })

  test('upload → backend transcribes → transcript renders', async ({ page }) => {
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

    await gotoAndUpload(page)

    // Verify SSE progress events appear in StatusBar before transcript is ready
    const statusText = page.locator('#status-text')
    await expect(statusText).toContainText(/Transcribing|Loading model/, { timeout: 60_000 })

    const transcriptContainer = page.locator('#transcript-container')
    const errorContainer = page.locator('#error-container')

    const outcome = await Promise.race([
      transcriptContainer.waitFor({ state: 'visible', timeout: 120_000 }).then(() => 'transcript' as const),
      errorContainer.waitFor({ state: 'visible', timeout: 120_000 }).then(() => 'error' as const),
    ])

    if (outcome === 'error') {
      const errorText = await errorContainer.textContent()
      const allErrors = [
        `UI error: ${errorText}`,
        ...consoleErrors.map(e => `console.error: ${e}`),
        ...pageErrors.map(e => `page error: ${e}`),
      ].join('\n')
      test.fail(true, `Transcription failed:\n${allErrors}`)
      return
    }

    const words = page.locator('.word')
    await expect(words.first()).toBeVisible()
    expect(await words.count()).toBeGreaterThan(5)

    await expect(page.locator('#meta-info')).toContainText('words')

    const transcriptText = await transcriptContainer.textContent()
    expect(transcriptText?.toLowerCase()).toContain('hello')

    const firstWord = words.first()
    const start = await firstWord.getAttribute('data-start')
    const end = await firstWord.getAttribute('data-end')
    expect(Number(start)).toBeGreaterThanOrEqual(0)
    expect(Number(end)).toBeGreaterThan(0)

    expect(pageErrors).toEqual([])
  })

  test('click-to-seek works with backend transcript', async ({ page }) => {
    await gotoAndUpload(page)
    await page.locator('#transcript-container').waitFor({ state: 'visible', timeout: 120_000 })

    const words = page.locator('.word')
    const midWord = words.nth(Math.floor(await words.count() / 2))
    const expectedStartMs = Number(await midWord.getAttribute('data-start'))

    await midWord.click()
    await page.waitForTimeout(500)

    const audio = page.locator('audio')
    const currentTimeSec = await audio.evaluate((el) => (el as HTMLAudioElement).currentTime)
    expect(Math.abs(currentTimeSec * 1000 - expectedStartMs)).toBeLessThan(1000)
  })

  test('warning banner when backend unreachable', async ({ page }) => {
    await page.route('**/api/info', (route) => route.abort())
    await page.goto('/')
    await page.waitForTimeout(2000)

    const warning = page.locator('#backend-warning')
    await expect(warning).toBeVisible()
    await expect(warning).toContainText('unreachable')
  })
})

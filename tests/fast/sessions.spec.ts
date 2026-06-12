import { expect, test, type Page } from '@playwright/test'

import { setupMockBackend, uploadTestAudio } from '../fixtures'

type SeedSessionArgs = {
  session: {
    id: string
    name: string
    createdAt: number
    durationSec: number
    transcriptionTimeSec?: number
  }
  transcript: {
    text: string
    chunks: Array<{ text: string; timestamp: [number | null, number | null] }>
    hardware?: string
    model?: string
    dtype?: string
    engine?: string
    execution_backend?: string
  }
}

async function seedSession(page: Page, args: SeedSessionArgs) {
  await page.evaluate((payload) => {
    const key = '__vibe_mock_sessions'
    let map: Record<string, unknown> = {}
    try {
      map = JSON.parse(window.localStorage.getItem(key) || '{}')
    } catch {
      map = {}
    }
    map[payload.session.id] = {
      id: payload.session.id,
      name: payload.session.name,
      durationSec: payload.session.durationSec,
      transcriptionTimeSec: payload.session.transcriptionTimeSec ?? null,
      transcript: payload.transcript,
      createdAt: payload.session.createdAt,
      audio: 'mock',
    }
    window.localStorage.setItem(key, JSON.stringify(map))
  }, args)
}

test.describe('Vibe Transcription - Session runtime info', () => {
  test('switching sessions updates runtime info to the viewed transcript', async ({ page }) => {
    await setupMockBackend(page)
    await page.goto('/')

    await uploadTestAudio(page)
    await expect(page.locator('#transcript-container')).toBeVisible()
    await expect(page.locator('.session-item')).toHaveCount(1)
    await expect(page.locator('#runtime-model')).toContainText('base')

    await page.locator('.new-btn').click()
    await page.locator('#model-select').selectOption('small')
    await uploadTestAudio(page)

    await expect(page.locator('#transcript-container')).toBeVisible()
    await expect(page.locator('.session-item')).toHaveCount(2)
    await expect(page.locator('#runtime-model')).toContainText('small')

    await page.locator('.session-item').nth(1).click()
    await expect(page.locator('#runtime-model')).toContainText('base')
    await expect(page.locator('#runtime-model')).not.toContainText('small')

    await page.locator('.session-item').nth(0).click()
    await expect(page.locator('#runtime-model')).toContainText('small')
  })

  test('legacy session without runtime metadata shows N/A placeholders', async ({ page }) => {
    await setupMockBackend(page)
    await page.goto('/')

    await seedSession(page, {
      session: {
        id: 'legacy-session',
        name: 'legacy.m4a',
        createdAt: Date.now(),
        durationSec: 3,
        transcriptionTimeSec: 1.2,
      },
      transcript: {
        text: 'legacy transcript',
        chunks: [{ text: 'legacy', timestamp: [0, 0.5] }],
      },
    })

    await page.reload()
    await expect(page.locator('.session-item')).toHaveCount(1)

    await page.locator('.session-item').first().click()
    await expect(page.locator('#runtime-info')).toBeVisible()
    await expect(page.locator('#runtime-architecture')).toContainText('N/A')
    await expect(page.locator('#runtime-model')).toContainText('N/A')
    await expect(page.locator('#runtime-execution-backend')).toContainText('N/A')
    await expect(page.locator('#runtime-execution-backend')).toContainText('N/A · N/A')
  })
})

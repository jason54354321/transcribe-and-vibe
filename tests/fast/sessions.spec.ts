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
  await page.evaluate(async (payload) => {
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.open('vibe-sessions', 1)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' })
          sessionStore.createIndex('by-createdAt', 'createdAt')
        }
        if (!db.objectStoreNames.contains('sessionBlobs')) {
          db.createObjectStore('sessionBlobs')
        }
        if (!db.objectStoreNames.contains('sessionTranscripts')) {
          db.createObjectStore('sessionTranscripts')
        }
      }

      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction(['sessions', 'sessionBlobs', 'sessionTranscripts'], 'readwrite')

        tx.objectStore('sessions').put(payload.session)
        tx.objectStore('sessionBlobs').put(
          new Blob(['legacy-audio'], { type: 'audio/mp4' }),
          payload.session.id,
        )
        tx.objectStore('sessionTranscripts').put(payload.transcript, payload.session.id)

        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error ?? new Error('Failed to seed session'))
        tx.onabort = () => reject(tx.error ?? new Error('Failed to seed session'))
      }
    })
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

import { expect, test } from '@playwright/test'

import { setupMockBackend, transcribeAndWaitForSession } from '../fixtures'

test.describe('Vibe Transcription - Fast Loop', () => {
  test.describe('sidebar responsive behavior', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockBackend(page)
      await page.goto('/')
    })

    test('desktop sidebar remains visible when main content scrolls', async ({ page }) => {
      await transcribeAndWaitForSession(page)

      await page.evaluate(() => {
        const div = document.createElement('div')
        div.style.height = '2000px'
        document.querySelector('.main-content')?.appendChild(div)
      })

      await page.setViewportSize({ width: 1024, height: 768 })

      const sidebarBoxBefore = await page.locator('.sidebar').boundingBox()
      expect(sidebarBoxBefore?.y).toBe(0)

      await page.evaluate(() => window.scrollBy(0, 1000))
      await page.waitForTimeout(100)

      const sidebarBoxAfter = await page.locator('.sidebar').boundingBox()
      expect(sidebarBoxAfter?.y).toBe(0)
    })

    test('mobile sidebar uses drawer behavior', async ({ page }) => {
      await page.setViewportSize({ width: 400, height: 800 })

      const sidebar = page.locator('.sidebar')
      const mobileToggle = page.locator('.mobile-toggle')
      const backdrop = page.locator('.sidebar-backdrop')

      await expect(mobileToggle).toBeVisible()

      await expect(sidebar).not.toHaveClass(/is-open/)

      await mobileToggle.click()
      await expect(sidebar).toHaveClass(/is-open/)
      await expect(backdrop).toBeVisible()

      await backdrop.click({ position: { x: 350, y: 50 } })
      await expect(sidebar).not.toHaveClass(/is-open/)
      await expect(backdrop).toBeHidden()
    })
  })
})

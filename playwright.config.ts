import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
const webServerPort = Number(process.env.PLAYWRIGHT_WEB_SERVER_PORT || '5173')
const useExternalWebServer = process.env.PLAYWRIGHT_EXTERNAL_WEBSERVER === '1'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  use: {
    baseURL,
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },

  projects: [
    {
      name: 'fast',
      testMatch: 'fast/**/*.spec.ts',
      timeout: 30_000,
    },
    {
      name: 'slow',
      testMatch: 'slow.spec.ts',
      timeout: 300_000,
      use: { headless: true },
    },
    {
      name: 'backend',
      testMatch: 'backend.spec.ts',
      timeout: 120_000,
      use: { headless: true },
    },
    {
      name: 'benchmark',
      testMatch: 'benchmark/**/*.spec.ts',
      timeout: 900_000,
      use: { headless: true },
    },
  ],

  webServer: useExternalWebServer
    ? undefined
    : {
        command: `npx vite --host 127.0.0.1 --port ${webServerPort}`,
        port: webServerPort,
        reuseExistingServer: !process.env.CI,
      },
})

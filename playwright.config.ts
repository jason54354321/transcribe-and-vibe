import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },

  projects: [
    {
      name: 'fast',
      testMatch: 'fast.spec.ts',
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

  webServer: {
    command: 'npx vite',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});

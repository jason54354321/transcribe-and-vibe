import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:8080',
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
    },
  ],

  webServer: {
    command: 'python3 -m http.server 8080 --directory src',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});

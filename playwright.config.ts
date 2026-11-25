import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120000,
  expect: { timeout: 20000 },
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8081',
    viewport: { width: 1440, height: 960 },
    channel: process.env.FINORA_BROWSER_CHANNEL || undefined,
    launchOptions: process.env.FINORA_CHROMIUM
      ? { executablePath: process.env.FINORA_CHROMIUM }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @finora/api start',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'node apps/api/scripts/preview.mjs',
      url: 'http://localhost:8081',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});

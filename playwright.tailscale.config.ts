/**
 * Tailscale URL (https://leo.tail65add4.ts.net:10443) 経由で E2E を走らせる config。
 *
 *   pnpm playwright test --config playwright.tailscale.config.ts
 *
 * dev mode だと Turbopack の HMR と HTTPS proxy の相性で hydration が
 * 不安定になることがあるため、production build + `pnpm start` の前提で使う。
 * webServer は明示しない (事前に `pnpm start` を立ち上げておく運用)。
 */
import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.TAILSCALE_BASE_URL ?? 'https://leo.tail65add4.ts.net:10443'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

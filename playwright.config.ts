import { defineConfig, devices } from '@playwright/test'

const PORT = 3001
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // dev server の Server Action / Realtime 並列処理が重く、全 CPU 並列だと
  // QuickAdd 連続入力 / Templates 作成 / heartbeat scan などが flaky になる。
  // 4 workers が経験的に安定 (HANDOFF §5.16 / §5.17)。
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // transformers ライブラリ初回ロード + Next.js 初回コンパイルで 60s 超えることがあるので
    // 余裕を持たせる (CI も同じで OK)
    timeout: 240_000,
  },
})

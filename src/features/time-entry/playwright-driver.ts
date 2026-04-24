/**
 * Mock Timesheet 向け Playwright driver。
 *
 * 本番では実在の外部システム用 driver を差し込む想定。
 * driver は pure に chromium を起動してフォームを埋めるだけ — time_entries の
 * DB 更新は worker 側で行う。
 *
 * 設計:
 *  - chromium はジョブ毎 launch / close (独立性 > スピード、MVP 規模で OK)
 *  - タイムアウト 45s (login + navigate + submit で 30s 程度の余裕)
 *  - 結果は `external_ref` を返す (mock が data-external-ref で露出している)
 */
import 'server-only'

import { type Browser, chromium } from '@playwright/test'

export interface DriverSubmitInput {
  workDate: string // YYYY-MM-DD
  category: string // 'dev' | 'meeting' | ...
  description: string
  hoursDecimal: number
}

export interface DriverConfig {
  baseUrl: string // e.g. http://localhost:3001
  email: string
  password: string
  /** テストで mock_timesheet に送る時の timeout (ms) */
  timeoutMs?: number
}

export interface DriverResult {
  externalRef: string
}

/**
 * Mock Timesheet driver の関数型インターフェイス。worker から呼び出される。
 * テスト時は差し替え可能 (例: in-process で mockTimesheetService.submit を呼ぶ mock driver)。
 */
export type TimesheetDriver = (
  config: DriverConfig,
  input: DriverSubmitInput,
) => Promise<DriverResult>

export const playwrightMockDriver: TimesheetDriver = async (config, input) => {
  const timeout = config.timeoutMs ?? 45_000
  let browser: Browser | null = null
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ baseURL: config.baseUrl })
    const page = await context.newPage()
    page.setDefaultTimeout(timeout)

    // login
    await page.goto('/mock-timesheet/login')
    await page.locator('#tsEmail').fill(config.email)
    await page.locator('#tsPassword').fill(config.password)
    await page.locator('#tsLoginSubmit').click()
    await page.waitForURL(/\/mock-timesheet\/new$/, { timeout })

    // submit form
    await page.locator('#tsDate').fill(input.workDate)
    await page.locator('#tsCategory').selectOption(input.category)
    await page.locator('#tsDescription').fill(input.description)
    await page.locator('#tsHours').fill(String(input.hoursDecimal))
    await page.locator('#tsSubmit').click()

    // 送信成功で [data-external-ref] が表示される
    const refEl = page.locator('[data-testid="mock-last-ref"]')
    await refEl.waitFor({ state: 'visible', timeout })
    const externalRef = await refEl.getAttribute('data-external-ref')
    if (!externalRef) throw new Error('external_ref が取得できませんでした')

    return { externalRef }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

/**
 * duration_minutes (整数) → hours (0.25 刻み) の変換。
 * 15 分単位にならない場合は 0.25 の倍数に切り上げ (下へ切り捨てないのは
 * 「1 分でも 15 分カウント」にするため)。
 */
export function minutesToHoursDecimal(minutes: number): number {
  if (minutes <= 0) return 0.25
  return Math.ceil(minutes / 15) / 4
}

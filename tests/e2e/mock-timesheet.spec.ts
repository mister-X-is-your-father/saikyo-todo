/**
 * Phase 1 E2E: mock-timesheet ログイン → 送信 → 一覧で反映確認。
 *
 * Playwright worker (Phase 3) がまさにこれを driver 経由で叩く。
 * E2E で先に手で動くことを確認しておく。
 */
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const EMAIL = 'ops@example.com'
const PASSWORD = 'password1234'

function admin() {
  return createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

test('mock-timesheet: login → submit → /entries に反映', async ({ page }) => {
  test.setTimeout(60_000)

  // login
  await page.goto('/mock-timesheet/login')
  await page.locator('#tsEmail').fill(EMAIL)
  await page.locator('#tsPassword').fill(PASSWORD)
  await page.locator('#tsLoginSubmit').click()
  await page.waitForURL(/\/mock-timesheet\/new$/)

  // 送信
  const desc = `E2E テスト ${Date.now()}`
  await page.locator('#tsDate').fill('2026-04-24')
  await page.locator('#tsCategory').selectOption('research')
  await page.locator('#tsDescription').fill(desc)
  await page.locator('#tsHours').fill('1.5')
  await page.locator('#tsSubmit').click()

  // 成功時 external_ref が出る
  const refRow = page.locator('[data-testid="mock-last-ref"]')
  await expect(refRow).toBeVisible({ timeout: 5_000 })
  const externalRef = await refRow.getAttribute('data-external-ref')
  expect(externalRef).toMatch(/^[0-9a-f-]{36}$/)

  // /entries ページで反映確認
  await page.goto('/mock-timesheet/entries')
  await expect(page.getByTestId('mock-entries-table')).toBeVisible()
  await expect(page.getByText(desc).first()).toBeVisible()

  // DB クリーンアップ
  if (externalRef) {
    const a = admin()
    await a.from('mock_timesheet_entries').delete().eq('id', externalRef).throwOnError()
  }
})

test('mock-timesheet: 未ログインで /new にアクセスすると login へ redirect', async ({ page }) => {
  const res = await page.goto('/mock-timesheet/new')
  // 最終的に login ページに落ち着く
  expect(page.url()).toMatch(/\/mock-timesheet\/login$/)
  expect(res?.status()).toBeLessThan(400)
})

test('mock-timesheet: 間違ったパスワードでは login に留まり toast が出る', async ({ page }) => {
  await page.goto('/mock-timesheet/login')
  await page.locator('#tsEmail').fill(EMAIL)
  await page.locator('#tsPassword').fill('wrong-pw')
  await page.locator('#tsLoginSubmit').click()
  await page.waitForTimeout(500)
  expect(page.url()).toMatch(/\/mock-timesheet\/login$/)
})

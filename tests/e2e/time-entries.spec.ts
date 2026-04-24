/**
 * Phase 2 E2E: saikyo-todo 側 time-entries ページの作成 + 一覧 + Sync ボタン。
 * Sync は Phase 3 で worker が処理するが、ここでは enqueue で pending → status 更新
 * まで確認する (external_ref は worker 未実装なので pending のまま)。
 */
import { expect, test } from '@playwright/test'

import { createE2EUser, loginViaUI } from './helpers'

test('time-entries: 作成 → 一覧に表示 → Sync ボタンで pending', async ({ page }) => {
  test.setTimeout(60_000)
  const user = await createE2EUser('te-ui')
  try {
    await loginViaUI(page, user)

    // workspace 作成
    const slug = `te-${Date.now().toString(36)}`
    await page.locator('#name').fill('Time Entry WS')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    // time-entries ページへ直接遷移 (ヘッダに導線はまだないので URL で)
    const wsUrl = page.url()
    await page.goto(`${wsUrl}/time-entries`)
    await expect(page.getByTestId('create-time-entry-form')).toBeVisible()

    // 作成
    await page.locator('#teDate').fill('2026-04-25')
    await page.locator('#teCategory').selectOption('research')
    await page.locator('#teDescription').fill('requirements を詰める')
    await page.locator('#teMinutes').fill('45')
    await page.getByTestId('create-time-entry-submit').click()
    await page.waitForTimeout(800)

    // 一覧
    await expect(page.getByTestId('time-entries-table')).toBeVisible()
    await expect(page.getByText('requirements を詰める')).toBeVisible()
    await expect(page.getByText('45分').first()).toBeVisible()

    // Sync ボタン押下
    const syncButton = page.locator('[data-testid^="time-entry-sync-"]').first()
    await syncButton.click()
    await page.waitForTimeout(500)
    // pending bada が残る (worker 未実装)
    await expect(page.getByText('pending').first()).toBeVisible()
  } finally {
    await user.cleanup()
  }
})

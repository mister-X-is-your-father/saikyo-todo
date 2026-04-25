/**
 * Phase 3 一括操作 E2E:
 *   - Item 3 件作成 → Backlog で 2 件選択 → bulk action bar 出現
 *   - "done" 状態への一括遷移
 *   - 一括 soft delete
 */
import { expect, test } from '@playwright/test'

import { createE2EUser, loginViaUI } from './helpers'

test('bulk: 選択 → 一括完了 → 一括削除', async ({ page }) => {
  test.setTimeout(90_000)
  const user = await createE2EUser('bulk')
  try {
    await loginViaUI(page, user)

    const slug = `bulk-${Date.now().toString(36)}`
    await page.locator('#name').fill('Bulk WS')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    for (const label of ['one', 'two', 'three']) {
      await page.locator('#quick-add-input').fill(label)
      await page.waitForTimeout(150)
      await page.getByTestId('quick-add-submit').click()
      await page.waitForTimeout(600)
    }

    await page.getByTestId('view-backlog-btn').click()
    await expect(page.getByTestId('backlog-view')).toBeVisible()

    // 初期は bulk action bar 非表示
    await expect(page.getByTestId('bulk-action-bar')).toHaveCount(0)

    // 最初の行と次の行の bulk-select を 2 つチェック
    const selects = page.locator(
      '[data-testid^="bulk-select-"]:not([data-testid="bulk-select-all"])',
    )
    await selects.nth(0).check()
    await selects.nth(1).check()

    await expect(page.getByTestId('bulk-action-bar')).toBeVisible()
    await expect(page.getByTestId('bulk-count')).toContainText('2 件')

    // "done" に一括遷移
    await page.getByTestId('bulk-status-done').click()
    await page.waitForTimeout(500)

    // 選択が clear される + bar 消える
    await expect(page.getByTestId('bulk-action-bar')).toHaveCount(0)

    // 3 件全部表示 (delete はしていない) + 2 件が done (ラベル "完了")
    const rows = page.getByTestId('backlog-view').locator('[data-testid^="backlog-row-"]')
    await expect(rows).toHaveCount(3)
    const doneBadges = page.getByTestId('backlog-view').getByText('完了')
    await expect(doneBadges).toHaveCount(2)

    // 残 1 件を soft delete
    await selects.nth(2).check()
    await expect(page.getByTestId('bulk-action-bar')).toBeVisible()
    page.on('dialog', (d) => void d.accept())
    await page.getByTestId('bulk-delete').click()
    await page.waitForTimeout(500)
    await expect(
      page.getByTestId('backlog-view').locator('[data-testid^="backlog-row-"]'),
    ).toHaveCount(2)
  } finally {
    await user.cleanup()
  }
})

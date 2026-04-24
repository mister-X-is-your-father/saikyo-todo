/**
 * Item 編集ダイアログ E2E:
 *   - 作成 → Backlog 行の「編集」ボタンからダイアログを開く
 *   - 開始日・期限・MUST/DoD を変更 → 保存 → 一覧に反映
 */
import { expect, test } from '@playwright/test'

import { createE2EUser, loginViaUI } from './helpers'

test('Item 編集: Backlog から編集ダイアログで開始日 / 期限 / MUST を更新', async ({ page }) => {
  test.setTimeout(60_000)
  const user = await createE2EUser('item-edit')
  try {
    await loginViaUI(page, user)

    // workspace 作成
    const slug = `edit-${Date.now().toString(36)}`
    await page.locator('#name').fill('Edit WS')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    // 通常 item を作成
    await page.locator('#quick-add-input').fill('編集対象 Item')
    await page.getByTestId('quick-add-submit').click()
    await page.waitForTimeout(500)

    // Backlog に切替
    await page.getByTestId('view-backlog-btn').click()
    await expect(page.getByTestId('backlog-view')).toBeVisible()

    // 編集ボタンを押す
    await page.locator('[data-testid^="backlog-edit-"]').first().click()
    await expect(page.getByTestId('item-edit-dialog')).toBeVisible()

    // 開始日・期限を入れる
    await page.getByTestId('edit-item-start-date').fill('2026-04-20')
    await page.getByTestId('edit-item-due-date').fill('2026-04-30')

    // MUST check + DoD
    await page.getByTestId('edit-item-must').check()
    await page.locator('#editDod').fill('ユーザ承認済み')

    // 保存
    await page.getByTestId('item-edit-save').click()
    await page.waitForTimeout(800)

    // ダイアログ閉じる + MUST バッジ表示
    await expect(page.getByTestId('item-edit-dialog')).not.toBeVisible()
    await expect(page.getByText('MUST').first()).toBeVisible()
  } finally {
    await user.cleanup()
  }
})

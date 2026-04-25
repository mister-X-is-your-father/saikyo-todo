/**
 * Phase 2 コラボ機能 E2E:
 *   - Item を作成 → Backlog から編集ダイアログを開く
 *   - コメント Tab で投稿 → 自分のコメントとして表示される
 *   - 基本 Tab でタグを新規作成 → 選択 → ダイアログ上にタグ chip が出る
 *   - 自分を assignee に set → picker ボタンに表示名が出る
 */
import { expect, test } from '@playwright/test'

import { createE2EUser, loginViaUI } from './helpers'

test('collaboration: comment + tag + assignee', async ({ page }) => {
  test.setTimeout(90_000)
  const user = await createE2EUser('collab')
  try {
    await loginViaUI(page, user)

    const slug = `collab-${Date.now().toString(36)}`
    await page.locator('#name').fill('Collab WS')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    // Item 作成
    await page.locator('#quick-add-input').fill('コラボ対象 Item')
    await page.getByTestId('quick-add-submit').click()
    await page.waitForTimeout(500)

    // Backlog → 編集ダイアログ
    await page.getByTestId('view-backlog-btn').click()
    await expect(page.getByTestId('backlog-view')).toBeVisible()
    await page.locator('[data-testid^="backlog-edit-"]').first().click()
    await expect(page.getByTestId('item-edit-dialog')).toBeVisible()

    // --- assignee 設定 ---
    await page.getByTestId('assignee-picker-trigger').click()
    // ワークスペースメンバー候補 (自分 1 人) が表示される
    const memberOption = page.locator('[data-testid^="assignee-option-"]').first()
    await expect(memberOption).toBeVisible()
    await memberOption.click()
    // 再度 Picker トリガを見て「未アサイン」表示じゃないことを確認
    await expect(page.getByTestId('assignee-picker-trigger')).not.toContainText('未アサイン')

    // --- タグ新規作成 + 選択 ---
    await page.getByTestId('tag-picker-trigger').click()
    await page.getByPlaceholder('タグを検索 or 作成…').fill('p1-urgent')
    await expect(page.getByTestId('tag-create-new')).toBeVisible()
    await page.getByTestId('tag-create-new').click()
    // タグを作成したので、picker button に "p1-urgent" が chip として並ぶ
    // (tag 作成 → onChange で setTags → UI 反映までの非同期チェーンに余裕を)
    await expect(page.getByTestId('tag-picker-trigger')).toContainText('p1-urgent', {
      timeout: 10_000,
    })

    // --- コメント Tab ---
    await page.getByTestId('tab-comments').click()
    await page.getByTestId('comment-input').fill('これは E2E コメントです')
    await page.getByTestId('comment-post').click()
    // 投稿したコメントがスレッドに出る
    await expect(page.getByText('これは E2E コメントです')).toBeVisible()
    // 自分のコメントなので 編集 / 削除 ボタンが見える
    await expect(page.locator('[data-testid^="comment-edit-"]').first()).toBeVisible()
  } finally {
    await user.cleanup()
  }
})

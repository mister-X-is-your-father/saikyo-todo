/**
 * Phase 3 Backlog DnD 並び替え E2E。
 * Item 3 件を position 順で作成 → 1 行目の drag handle で 3 行目の位置へ
 * ドロップ → 並び順が変わっていることを検証。
 */
import { expect, test } from '@playwright/test'

import { createE2EUser, loginViaUI } from './helpers'

test('backlog DnD: 行をドラッグして並び替え', async ({ page }) => {
  test.setTimeout(90_000)
  const user = await createE2EUser('backlog-dnd')
  try {
    await loginViaUI(page, user)

    const slug = `bldnd-${Date.now().toString(36)}`
    await page.locator('#name').fill('Backlog DnD WS')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    // 3 件の Item を作成
    for (const label of ['alpha', 'bravo', 'charlie']) {
      await page.locator('#quick-add-input').fill(label)
      await page.waitForTimeout(150)
      await page.getByTestId('quick-add-submit').click()
      await page.waitForTimeout(600)
    }

    await page.getByTestId('view-backlog-btn').click()
    await expect(page.getByTestId('backlog-view')).toBeVisible()

    // position ソートの初期状態で title 列の順序を記録
    const rowsBefore = await page
      .getByTestId('backlog-view')
      .locator('[data-testid^="backlog-row-"]')
      .allTextContents()
    expect(rowsBefore.length).toBe(3)
    const firstTitleBefore = rowsBefore[0]
    const lastTitleBefore = rowsBefore[2]
    expect(firstTitleBefore).not.toEqual(lastTitleBefore)

    // drag handle が 3 個ある
    const handles = page.getByTestId('backlog-drag-handle')
    await expect(handles).toHaveCount(3)

    // 1 行目を 3 行目の場所へドラッグ
    const firstHandle = handles.nth(0)
    const thirdHandle = handles.nth(2)
    const handleBox = await firstHandle.boundingBox()
    const targetBox = await thirdHandle.boundingBox()
    if (!handleBox || !targetBox) throw new Error('bounding box not found')

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    // 5px 以上動かして drag activation constraint を満たす
    await page.mouse.move(handleBox.x + 20, handleBox.y + handleBox.height / 2, { steps: 2 })
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2 + 5,
      { steps: 5 },
    )
    await page.mouse.up()
    await page.waitForTimeout(800)

    // reorder API の invalidate → UI 再取得で順序が変わっている
    const rowsAfter = await page
      .getByTestId('backlog-view')
      .locator('[data-testid^="backlog-row-"]')
      .allTextContents()
    expect(rowsAfter.length).toBe(3)
    // 先頭行の title が最初の state から変化している (= reorder 反映)
    expect(rowsAfter[0]).not.toEqual(firstTitleBefore)
  } finally {
    await user.cleanup()
  }
})

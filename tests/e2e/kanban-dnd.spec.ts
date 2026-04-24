/**
 * Kanban DnD regression test: TODO の card を 進行中 (空列) にドラッグ → status 変更。
 * useDroppable を列に付けていないと空列 drop が no-op になる問題の再発防止。
 */
import { expect, test } from '@playwright/test'

import { createE2EUser, loginViaUI } from './helpers'

test('Kanban DnD: TODO の card を 空の「進行中」列にドロップ → status 変更', async ({ page }) => {
  test.setTimeout(60_000)
  const user = await createE2EUser('kanban-dnd')
  try {
    await loginViaUI(page, user)

    const slug = `kb-${Date.now().toString(36)}`
    await page.locator('#name').fill('Kanban WS')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    await page.locator('#new-item-input').fill('ドラッグ対象タスク')
    await page.getByRole('button', { name: '作成', exact: true }).click()

    const card = page.locator('[data-testid^="kanban-card-"]').first()
    await expect(card).toBeVisible({ timeout: 5_000 })

    const progressCol = page.getByTestId('kanban-column-in_progress')
    await expect(progressCol).toBeVisible()

    // dnd-kit の PointerSensor は 5px activation なので、手動で段階的に
    // mouse move を発火させないと drag が始まらない。
    const cardBox = await card.boundingBox()
    const colBox = await progressCol.boundingBox()
    if (!cardBox || !colBox) throw new Error('bounding boxes not found')

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    // activation: >5px 移動
    await page.mouse.move(cardBox.x + cardBox.width / 2 + 10, cardBox.y + cardBox.height / 2, {
      steps: 3,
    })
    await page.mouse.move(colBox.x + colBox.width / 2, colBox.y + colBox.height / 2, { steps: 10 })
    await page.mouse.up()

    // status が切り替わり、card が進行中列の中にある
    await expect(progressCol.locator('[data-testid^="kanban-card-"]').first()).toBeVisible({
      timeout: 5_000,
    })
    await expect(
      page.getByTestId('kanban-column-todo').getByText('ドラッグ対象タスク'),
    ).toHaveCount(0)
  } finally {
    await user.cleanup()
  }
})

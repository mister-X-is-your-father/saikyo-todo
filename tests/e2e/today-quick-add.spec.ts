/**
 * Phase 1 E2E: QuickAdd で NL パース → Today 表示 → checkbox で完了。
 */
import { expect, test } from '@playwright/test'

import { createE2EUser, loginViaUI } from './helpers'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('QuickAdd "今日 ..." → Today 表示 → checkbox 完了', async ({ page }) => {
  test.setTimeout(60_000)
  const user = await createE2EUser('today-qa')
  try {
    await loginViaUI(page, user)

    const slug = `today-${Date.now().toString(36)}`
    await page.locator('#name').fill('Today WS')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    // QuickAdd: 今日 + p1 + #タスク
    const qa = page.locator('#quick-add-input')
    await expect(qa).toBeVisible()
    await qa.fill('今日 p1 #仕事 E2E 検証タスク')
    // preview chip 確認
    await expect(page.getByText('p1').first()).toBeVisible()
    await expect(page.getByText(todayISO()).first()).toBeVisible()
    await page.getByTestId('quick-add-submit').click()
    await page.waitForTimeout(600)

    // Today view 既定なので Today に表示される
    await expect(page.getByTestId('today-view')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('E2E 検証タスク')).toBeVisible()

    // checkbox で完了
    const checkbox = page.locator('[data-testid^="item-checkbox-"]').first()
    await checkbox.click()
    await page.waitForTimeout(500)
    // 完了すると Today view から消える
    await expect(page.getByText('今日のタスクはありません 🎉')).toBeVisible({ timeout: 5_000 })
  } finally {
    await user.cleanup()
  }
})

test('QuickAdd: 日付無し → Inbox に入る', async ({ page }) => {
  test.setTimeout(60_000)
  const user = await createE2EUser('inbox-qa')
  try {
    await loginViaUI(page, user)

    const slug = `inbox-${Date.now().toString(36)}`
    await page.locator('#name').fill('Inbox WS')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    await page.locator('#quick-add-input').fill('未整理タスク')
    await page.getByTestId('quick-add-submit').click()
    await page.waitForTimeout(500)

    // Today 初期表示で「今日のタスクはありません」
    await expect(page.getByText('今日のタスクはありません 🎉')).toBeVisible()

    // Inbox に切替
    await page.getByTestId('view-inbox-btn').click()
    await expect(page.getByTestId('inbox-view')).toBeVisible()
    await expect(page.getByText('未整理タスク')).toBeVisible()
  } finally {
    await user.cleanup()
  }
})

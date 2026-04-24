/**
 * Baseline smoke E2E.
 * golden path の第 1 歩: login → workspace 作成 → Item 作成 → リスト表示。
 * 以降、Kanban / Gantt / Backlog / MUST / AI / Template を追加していく。
 *
 * 実行: `pnpm test:e2e` (Supabase 起動 + pnpm dev の auto 起動)。
 */
import { expect, test } from '@playwright/test'

import { createE2EUser, loginViaUI } from './helpers'

test('home page renders (未ログイン)', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveTitle(/最強TODO/)
})

test('baseline: login → workspace 作成 → Item 作成 → 一覧表示', async ({ page }) => {
  const user = await createE2EUser('smoke')
  try {
    await loginViaUI(page, user)

    // workspace 一覧ページで "最初の Workspace を作成" カードが出ている
    // (shadcn CardTitle は role=heading ではなく div なので getByText)
    await expect(page.getByText('最初の Workspace を作成')).toBeVisible()

    // workspace 作成
    const slug = `smoke-${Date.now().toString(36)}`
    await page.locator('#name').fill('Smoke ワークスペース')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()

    // /[wsId] に遷移 (uuid)
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    // ItemsBoard: 新規 Item 入力 → 作成
    await page.locator('#new-item-input').fill('E2E smoke item')
    // Item 作成フォーム内の "作成" ボタン (workspace 作成とは context が別)
    await page.getByRole('button', { name: '作成', exact: true }).click()

    // Kanban board (既定) がレンダリングされる
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 })
    // todo 列に item が現れる
    const todoColumn = page.getByTestId('kanban-column-todo')
    await expect(todoColumn.getByText('E2E smoke item')).toBeVisible({ timeout: 10_000 })
    // in_progress / done 列は空
    await expect(
      page.getByTestId('kanban-column-in_progress').getByText('カードなし'),
    ).toBeVisible()
    await expect(page.getByTestId('kanban-column-done').getByText('カードなし')).toBeVisible()

    // Backlog view に切替 → URL に ?view=backlog が付く / テーブル行に item が現れる
    await page.getByTestId('view-backlog-btn').click()
    await expect(page).toHaveURL(/[?&]view=backlog/)
    await expect(page.getByTestId('backlog-view')).toBeVisible()
    await expect(page.getByTestId('backlog-view').getByText('E2E smoke item')).toBeVisible()

    // status フィルタ: done にすると item は消える (todo の 1 件だけなので)
    await page.getByTestId('filter-status').selectOption('done')
    await expect(page).toHaveURL(/[?&]status=done/)
    await expect(page.getByTestId('backlog-view').getByText('E2E smoke item')).not.toBeVisible()
    // フィルタ解除
    await page.getByTestId('filter-status').selectOption('')
    await expect(page.getByTestId('backlog-view').getByText('E2E smoke item')).toBeVisible()
  } finally {
    await user.cleanup()
  }
})

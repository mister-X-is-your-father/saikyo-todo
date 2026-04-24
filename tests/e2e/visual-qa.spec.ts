/**
 * 全 UI の視覚 QA — 各画面でスクショを撮り、scripts/screenshots/ に保存する。
 * Playwright 一度流して、スクショを目で確認して直す、というループ用。
 */
import { expect, test } from '@playwright/test'

import { createE2EUser, loginViaUI } from './helpers'

const SHOTS_DIR = 'scripts/screenshots'

test.use({
  viewport: { width: 1440, height: 900 },
})

test('全 UI 視覚 QA スクショ収集', async ({ page }) => {
  test.setTimeout(120_000)

  // ---------- 1. 未ログイン画面 ----------
  await page.goto('/login')
  await expect(page.locator('#email')).toBeVisible()
  await page.screenshot({ path: `${SHOTS_DIR}/01-login.png`, fullPage: true })

  await page.goto('/signup')
  await expect(page.locator('#email')).toBeVisible()
  await page.screenshot({ path: `${SHOTS_DIR}/02-signup.png`, fullPage: true })

  // ---------- 2. ログイン + workspace 作成前 ----------
  const user = await createE2EUser('visqa')
  try {
    await loginViaUI(page, user)

    // root / はログイン後 workspace 一覧 + 作成フォーム
    await page.waitForURL('/')
    await page.screenshot({ path: `${SHOTS_DIR}/03-root-no-workspace.png`, fullPage: true })

    // workspace 作成
    const slug = `visqa-${Date.now().toString(36)}`
    await page.locator('#name').fill('視覚 QA Workspace')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)

    // ---------- 3. workspace ページ (Kanban default) ----------
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.screenshot({ path: `${SHOTS_DIR}/04-workspace-kanban-empty.png`, fullPage: true })

    // Item を 3 件作成 (MUST / MUST+DoD / 通常)
    await page.locator('#new-item-input').fill('通常タスク A')
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForTimeout(500)
    await page.locator('#new-item-input').fill('MUST タスク B')
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForTimeout(500)
    await page
      .locator('#new-item-input')
      .fill('通常タスク C (長いタイトルで改行テスト:何文字まで入れると表示が崩れるのか見る)')
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForTimeout(800)

    await page.screenshot({ path: `${SHOTS_DIR}/05-kanban-with-items.png`, fullPage: true })

    // ---------- 4. Backlog view ----------
    await page
      .getByTestId('view-backlog-btn')
      .click()
      .catch(async () => {
        // testid 未設定ならテキストで
        await page.getByRole('button', { name: /Backlog|バックログ/i }).click()
      })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SHOTS_DIR}/06-backlog.png`, fullPage: true })

    // ---------- 5. Gantt view ----------
    await page
      .getByTestId('view-gantt-btn')
      .click()
      .catch(async () => {
        await page.getByRole('button', { name: /Gantt|ガント/i }).click()
      })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SHOTS_DIR}/07-gantt.png`, fullPage: true })

    // ---------- 6. Dashboard view ----------
    await page
      .getByTestId('view-dashboard-btn')
      .click()
      .catch(async () => {
        await page.getByRole('button', { name: /Dashboard|ダッシュボード/i }).click()
      })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SHOTS_DIR}/08-dashboard.png`, fullPage: true })

    // ---------- 7. Templates ページ ----------
    await page.getByRole('link', { name: /Templates|テンプレート/i }).click()
    await page.waitForURL(/\/templates/)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SHOTS_DIR}/09-templates.png`, fullPage: true })

    // サンプル Template の詳細展開
    const sampleCard = page.getByText('クライアント onboarding').first()
    if (await sampleCard.isVisible()) {
      await sampleCard.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SHOTS_DIR}/10-templates-expanded.png`, fullPage: true })
    }

    // ---------- 8. Command Palette ----------
    // Workspace に戻ってから
    const backUrl = page.url().replace(/\/templates.*$/, '')
    await page.goto(backUrl)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.keyboard.press('ControlOrMeta+K')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SHOTS_DIR}/11-command-palette.png`, fullPage: true })
    await page.keyboard.press('Escape')

    // ---------- 8b. 存在しない workspace へアクセス (権限エラー) ----------
    await page.goto('/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SHOTS_DIR}/11b-not-found.png`, fullPage: true })
    await page.goto(backUrl)
    await page.waitForLoadState('networkidle').catch(() => {})

    // ---------- 9. Workspace ヘッダの Agent ボタン類 ----------
    const wsUrl = page.url().replace(/\/templates.*$/, '')
    await page.goto(wsUrl)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SHOTS_DIR}/12-workspace-header.png`, fullPage: false })

    // ---------- 10. モバイル幅で 1 枚確認 ----------
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SHOTS_DIR}/13-mobile-kanban.png`, fullPage: true })
  } finally {
    await user.cleanup()
  }
})

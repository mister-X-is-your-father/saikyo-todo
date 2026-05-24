/**
 * Phase 6.15 loop iter1309 (mode-M = Mobile audit): iPhone SE 320px で
 * /goals (GoalsPanel) を audit。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - 主要 button (`goal-toggle-` / `kr-add-btn-` / `kr-delete-` / `goal-archive-` 等)
 *     bounding box ≥ 44x44
 *   - Goal card 内 inline form の Input/Textarea が viewport 内
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-goals-iter1309.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-goals-iter1309',
  device: 'iPhone SE',
  isMobile: true,
  async seed(admin, { workspaceId, userId }) {
    // Goal 1 件 + KR 1 件 を入れて GoalsPanel を render させる
    const insGoal = await admin
      .from('goals')
      .insert({
        workspace_id: workspaceId,
        title: 'モバイル audit 用 Goal',
        description: 'iPhone SE 320px viewport 動作確認',
        status: 'active',
        start_date: '2026-04-01',
        end_date: '2026-06-30',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (insGoal.error || !insGoal.data) throw insGoal.error ?? new Error('goal insert failed')
    const goalId = insGoal.data.id as string

    const insKr = await admin.from('key_results').insert({
      goal_id: goalId,
      title: 'モバイル audit 用 KR (例: p95 < 200ms)',
      progress_mode: 'manual',
      target_value: 100,
      unit: '%',
    })
    if (insKr.error) throw insKr.error
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/goals`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // 横 overflow チェック
    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `documentElement.scrollWidth=${docW}px > viewport ${viewW}px (横 overflow)`,
      })
    }

    // Goal card を展開して KR list 表示
    const goalToggle = page.locator('[data-testid^="goal-toggle-"]').first()
    if ((await goalToggle.count()) > 0) {
      await goalToggle.tap()
      await page.waitForTimeout(300)
    }

    // 各 button の bounding box チェック
    const targets = [
      '[data-testid^="goal-toggle-"]',
      '[data-testid^="goal-complete-"]',
      '[data-testid^="goal-archive-"]',
      '[data-testid^="kr-add-btn-"]',
      '[data-testid^="kr-delete-"]',
      '[data-testid^="kr-title-input-"]',
      '[data-testid="goal-title"]',
      '[data-testid="goal-desc"]',
    ]
    for (const sel of targets) {
      const loc = page.locator(sel).first()
      if ((await loc.count()) === 0) {
        console.log(`  ${sel}: not found`)
        continue
      }
      const box = await loc.boundingBox()
      if (!box) continue
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      console.log(`  ${sel}: ${w}x${h}`)
      if (h < 44 || w < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sel}: ${w}x${h} < 44x44 (WCAG 2.5.5 違反)`,
        })
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-goals-iter1309.png',
      fullPage: true,
    })
  },
})

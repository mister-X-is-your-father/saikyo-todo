/**
 * playwright-iter1372 (mode-M = Mobile audit): iPhone SE 320px で Gantt view を audit。
 *
 * 確認:
 *   - body 横 overflow なし (gantt は内部 overflow-x で scroll する想定)
 *   - gantt 操作 control (zoom select / 完了 toggle checkbox / bar) の tap target 44x44
 *   - bar (role=button) が tap で到達可能
 *
 * 探索のみ (bug あれば次 iter で fix)。
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-gantt-iter1372.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'mobile-gantt-iter1372',
  device: 'iPhone SE',
  isMobile: true,
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const s = new Date().toISOString().slice(0, 10)
    const e = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    await admin.from('items').insert([
      {
        workspace_id: workspaceId,
        title: 'Gantt バー項目 A',
        status: 'in_progress',
        priority: 2,
        start_date: s,
        due_date: e,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: 'Gantt バー項目 B',
        status: 'todo',
        priority: 1,
        is_must: true,
        start_date: s,
        due_date: e,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    // 初回 render が gantt empty-state を掴むことがあるため、未 populate なら 1 度 reload
    if ((await page.locator('[data-testid="gantt-zoom-select"]').count()) === 0) {
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)
    }

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `body 横 overflow: scrollWidth=${docW} > ${viewW}`,
      })
    }

    // 操作 control の tap target
    const targets = [
      '[data-testid="gantt-zoom-select"]',
      '[data-testid="gantt-show-deps-toggle"]',
      '[data-testid="gantt-hide-done-toggle"]',
      '[data-testid="gantt-jump-today"]',
      '[data-testid^="gantt-bar-"]',
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
      if (w < 44 || h < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sel}: ${w}x${h} < 44x44 (WCAG 2.5.5)`,
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-gantt-iter1372.png', fullPage: true })
  },
})

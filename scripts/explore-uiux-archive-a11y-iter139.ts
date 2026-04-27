/**
 * Phase 6.15 loop iter 139 — /archive テーブルの SR / a11y smoke。
 *
 * iter133 で /time-entries に同パターンを適用した SR 識別 a11y を archive にも展開。
 * 想定 finding (修正前):
 *   - MUST ⚠ icon が aria 不可視 (visual only)
 *   - 「復元」button が button text のみで対象 entry を SR 識別できない
 *   - title Link の aria-label に archive メタ (archivedAt) が含まれず、SR で
 *     「いつ archive された item か」が分からない
 */
import { createClient } from '@supabase/supabase-js'

import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'archive-a11y-iter139',
  body: async ({ page, workspaceId, findings }) => {
    const admin = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
    const userId = (await admin.auth.admin.listUsers()).data.users[0]!.id
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'iter139 archive a11y seed',
      status: 'todo',
      is_must: true,
      archived_at: new Date().toISOString(),
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })

    await page.goto(`http://localhost:3001/${workspaceId}/archive`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1200)

    const rows = await page.locator('[data-testid^="archive-row-"]').count()
    console.log(`[iter139] archive rows: ${rows}`)
    if (rows === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'archive 行が描画されない (seed 失敗?)',
      })
      return
    }

    // restore button の aria-label に item title が含まれるか
    const btn = page.locator('[data-testid^="archive-restore-"]').first()
    const lab = await btn.getAttribute('aria-label')
    console.log(`[iter139] restore aria-label: ${JSON.stringify(lab)}`)
    if (!lab || !lab.includes('iter139')) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message:
          'archive 復元 button に aria-label が無い / item title 識別不可 (iter133 ItemCheckbox 同パターン未適用)',
      })
    }

    // MUST ⚠ icon の aria 可視性
    const mustSpan = page
      .locator('[data-testid^="archive-row-"]')
      .first()
      .locator('span:has-text("⚠")')
    if ((await mustSpan.count()) > 0) {
      const role = await mustSpan.first().getAttribute('role')
      const mustLab = await mustSpan.first().getAttribute('aria-label')
      console.log(`[iter139] MUST icon role=${role} aria-label=${JSON.stringify(mustLab)}`)
      if (!role && !mustLab) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message:
            'archive 行の MUST ⚠ icon が visual only (role/aria-label 無し、SR で MUST item と認識不能)',
        })
      }
    }
  },
})

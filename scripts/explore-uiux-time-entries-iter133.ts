/**
 * Phase 6.15 loop iter 133 — /time-entries 画面の SR / a11y smoke。
 *
 * iter90 (PDCA DailyBars title→aria-label)、iter98 (PDCA distribution role=img)、
 * iter92 (priority dot title→aria-label) と同種の "title 属性のみ → SR 不可視" gap を
 * time-entries-table に対して検証する。
 *
 * 想定 finding (修正前):
 *   - sync error 行が `title` 属性のみで SR から内容不可視
 *   - sync button の aria-label に対象 entry の識別情報なし (iter93 ItemCheckbox 同パターン)
 *   - SyncBadge が色情報のみで SR 語彙に意味なし (synced/failed/pending 英単語のまま)
 */
import { createClient } from '@supabase/supabase-js'

import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'time-entries-iter133',
  body: async ({ page, workspaceId, findings }) => {
    // 1 件 seed (admin 経由で direct insert) — UI 経由作成は別 iter で
    const admin = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
    await admin.from('time_entries').insert({
      workspace_id: workspaceId,
      user_id: (await admin.auth.admin.listUsers()).data.users[0]!.id,
      work_date: new Date().toISOString().slice(0, 10),
      category: 'dev',
      description: 'iter133 seed: SR a11y check',
      duration_minutes: 30,
      sync_status: 'failed',
      sync_error: 'mock timesheet endpoint not reachable',
      idempotency_key: `iter133-${Date.now()}`,
    })

    await page.goto(`http://localhost:3001/${workspaceId}/time-entries`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1200)

    const rowCount = await page.locator('[data-testid^="time-entry-row-"]').count()
    console.log(`[iter133] rows: ${rowCount}`)
    if (rowCount === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'time-entries-table の行が描画されない (seed 失敗?)',
      })
      return
    }

    // sync error 表示 div の aria-label / role 検証
    const errCount = await page
      .locator('[data-testid^="time-entry-row-"] [data-testid^="sync-error-"]')
      .count()
    console.log(`[iter133] sync-error nodes (with testid): ${errCount}`)
    if (errCount === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message:
          'sync error の表示要素に data-testid="sync-error-*" / aria-label が無い (title 属性のみで SR 不可視)',
      })
    }

    // sync button の aria-label に entry 識別情報が含まれるか
    const syncBtn = page.locator('[data-testid^="time-entry-sync-"]').first()
    if ((await syncBtn.count()) > 0) {
      const lab = await syncBtn.getAttribute('aria-label')
      console.log(`[iter133] sync btn aria-label: ${JSON.stringify(lab)}`)
      if (!lab || !lab.includes('iter133')) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message:
            'sync button の aria-label に entry 識別情報 (description / 日付) が無い (iter93 ItemCheckbox 同パターン未適用)',
        })
      }
    }

    // SyncBadge の SR 読み上げ語彙
    const badgeText = await page
      .locator('[data-testid^="time-entry-row-"]')
      .first()
      .locator('[data-testid="sync-badge"]')
      .first()
      .getAttribute('aria-label')
      .catch(() => null)
    console.log(`[iter133] sync-badge aria-label: ${JSON.stringify(badgeText)}`)
    if (!badgeText) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message:
          'SyncBadge に aria-label が無い ("synced"/"failed"/"pending" 英単語のみで SR に意味が伝わらない)',
      })
    }
  },
})

/**
 * Phase 6.15 loop iter 135 — Backlog table の row-click 仕様 smoke。
 *
 * iter134 で Today / Inbox / Dashboard MUST / Personal-period の 4 view を
 * row-anywhere-click にしたが、Backlog table の `<tr>` には onClick が無く
 * MUST 列 / 期限列 / 更新列のセル余白をクリックしても dialog が開かない
 * (title button cell と action buttons cell のみ onClick を持つ)。
 *
 * 期待 (iter135 修正後):
 *   - 期限列セルをクリック → ItemEditDialog (URL ?item=) が開く
 */
import { createClient } from '@supabase/supabase-js'

import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'backlog-row-click-iter135',
  body: async ({ page, workspaceId, findings }) => {
    const admin = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
    // 1 件 seed
    const { data: insert } = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: 'iter135 backlog row-click smoke',
        status: 'todo',
        due_date: '2026-05-01',
        created_by_actor_type: 'user',
        created_by_actor_id: (await admin.auth.admin.listUsers()).data.users[0]!.id,
      })
      .select('id')
      .single()
    const itemId = insert?.id as string

    await page.goto(`http://localhost:3001/${workspaceId}?view=core.view.backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1500)

    const row = page.locator(`[data-testid="backlog-row-${itemId}"]`)
    if ((await row.count()) === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'backlog row が描画されない (seed ↔ view 接続失敗?)',
      })
      return
    }

    // 期限列セル (3 列目以降) をクリック → URL に ?item= が付くか確認
    // tr の最終セル付近 (期限/更新) を狙う
    const dueCell = row.locator('td').nth(4) // status / 優先度 / title / MUST / 期限
    await dueCell.click({ force: true })
    await page.waitForTimeout(500)
    const urlAfter = page.url()
    console.log(`[iter135] url after due-cell click: ${urlAfter}`)
    if (!urlAfter.includes(`item=${itemId}`)) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message:
          '期限/更新セルをクリックしても URL に ?item= が付かない (Backlog table の <tr> に onClick が無い → iter134 row-click 仕様の残)',
      })
    }
  },
})

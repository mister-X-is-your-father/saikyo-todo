/**
 * Phase 6.15 loop iter 136 — Gantt 行 (label + timeline) の row-click smoke。
 *
 * iter134/135 で Today/Inbox/Dashboard/Personal-period/Backlog/Kanban を
 * row-anywhere-click にしたが、Gantt 行は label 列タイトルにも onClick が無く
 * timeline 内の bar/milestone のみ onClick を持つ。
 *
 * 期待 (iter136 修正後):
 *   - label 列の item title (timeline 外) クリックで URL に ?item= が付く
 *   - timeline 内の余白 (bar 外) クリックでも ?item= が付く
 */
import { createClient } from '@supabase/supabase-js'

import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'gantt-row-click-iter136',
  body: async ({ page, workspaceId, findings }) => {
    const admin = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
    const userId = (await admin.auth.admin.listUsers()).data.users[0]!.id
    const today = new Date().toISOString().slice(0, 10)
    const due = new Date(Date.now() + 7 * 24 * 3600_000).toISOString().slice(0, 10)
    const { data: insert } = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: 'iter136 gantt row-click smoke',
        status: 'todo',
        start_date: today,
        due_date: due,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    const itemId = insert?.id as string

    await page.goto(`http://localhost:3001/${workspaceId}?view=core.view.gantt`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1500)

    const row = page.locator(`[data-testid="gantt-row-${itemId}"]`)
    if ((await row.count()) === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'gantt-row が描画されない (seed ↔ Gantt 接続失敗?)',
      })
      return
    }

    // label 列 (timeline 外) のタイトル文字をクリック
    await row.locator('.truncate').first().click({ force: true })
    await page.waitForTimeout(400)
    const url = page.url()
    console.log(`[iter136] url after label click: ${url}`)
    if (!url.includes(`item=${itemId}`)) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message:
          'Gantt の label 列クリックで URL に ?item= が付かない (iter134/135 row-click 仕様の残)',
      })
    }
  },
})

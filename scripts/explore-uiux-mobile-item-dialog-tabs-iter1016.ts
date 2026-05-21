/**
 * iter1016 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で ItemEditDialog の 7 tab (基本 / サマリ / 子タスク / 依存 /
 * コメント / アクティビティ) の overflow / tap target audit。
 *
 * 構造 (item-edit-dialog.tsx line 333):
 *   <TabsList className="w-full" aria-label="Item 編集タブ">
 *     <TabsTrigger value="base">基本</TabsTrigger>
 *     <TabsTrigger value="summary">サマリ</TabsTrigger>
 *     <TabsTrigger value="subtasks">子タスク [badge]</TabsTrigger>
 *     <TabsTrigger value="dependencies">依存 [badge]</TabsTrigger>
 *     <TabsTrigger value="comments">コメント</TabsTrigger>
 *     <TabsTrigger value="activity">アクティビティ</TabsTrigger>
 *   </TabsList>
 *
 * 7 tab を `w-full` で並べると 320px viewport では 1 tab あたり ~45px に潰れる
 * 可能性大。tap target 44x44 を満たすか + visible text が読めるかを確認。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-item-dialog-tabs-iter1016',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const a = await admin
      .from('items')
      .insert({
        workspace_id: ws,
        title: 'iter1016 mobile dialog tabs audit',
        status: 'todo',
        is_must: true,
        dod: 'DoD dummy',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select()
      .single()
    if (a.error || !a.data) throw a.error
    const itemId = a.data.id as string

    // Item をクリックで edit dialog 開く
    await page.goto(`http://localhost:3001/${ws}?item=${itemId}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="item-edit-dialog"]', { timeout: 10_000 })

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)

    // 7 tab を測る
    const tabIds = ['base', 'summary', 'subtasks', 'dependencies', 'comments', 'activity']
    const results = await page.evaluate((ids) => {
      return ids.map((id) => {
        const el = document.querySelector(`[data-testid="tab-${id}"]`) as HTMLElement | null
        if (!el) return { id, found: false }
        const r = el.getBoundingClientRect()
        return {
          id,
          found: true,
          w: Math.round(r.width),
          h: Math.round(r.height),
          right: Math.round(r.right),
          textVisible: (el.textContent ?? '').trim().slice(0, 40),
        }
      })
    }, tabIds)
    let below44 = 0
    for (const t of results) {
      if (!t.found) {
        findings.push({
          level: 'info',
          source: 'observation',
          message: `tab-${t.id}: not visible (locator miss)`,
        })
        continue
      }
      console.log(`[tab-${t.id}] ${t.w}x${t.h} right=${t.right} text="${t.textVisible}"`)
      if ((t.h ?? 0) < 44 || (t.w ?? 0) < 44) {
        below44 += 1
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `tab-${t.id}: ${t.w}x${t.h} < 44x44 (tap target 不足、7 tab on 320px viewport)`,
        })
      }
    }
    console.log(`[summary] tabs below 44x44: ${below44} / 7`)

    // Dialog 自体の overflow チェック
    const dialogMetrics = await page.evaluate(() => {
      const dlg = document.querySelector('[data-testid="item-edit-dialog"]') as HTMLElement | null
      if (!dlg) return null
      const r = dlg.getBoundingClientRect()
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        right: Math.round(r.right),
        top: Math.round(r.top),
      }
    })
    console.log(`[dialog] ${JSON.stringify(dialogMetrics)}`)

    await page.screenshot({
      path: '/tmp/uiux-mobile-item-dialog-tabs-iter1016.png',
      fullPage: true,
    })
  },
})

/**
 * iter1025 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で BulkActionBar (固定 bottom-4 left-1/2 -translate-x-1/2 で
 * 中央 floating の panel) の positioning / readability audit。
 *
 * 構造 (bulk-action-bar.tsx):
 *   - `fixed bottom-4 left-1/2 -translate-x-1/2 z-40 ...`
 *   - content: N 件選択中 + status change buttons (workspace_statuses 数) + 削除 + 解除
 *
 * iter1024 (ActiveTimerPanel) で発見した「fixed panel が viewport 超え」 同種 hazard が
 * BulkActionBar にも存在するか確認。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-bulk-action-bar-iter1025',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = await admin
        .from('items')
        .insert({
          workspace_id: ws,
          title: `iter1025 bulk audit item ${i + 1}`,
          status: 'todo',
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        })
        .select()
        .single()
      if (r.error || !r.data) throw r.error
      ids.push(r.data.id as string)
    }

    // Backlog view で bulk select する (checkbox 列がある)
    await page.goto(`http://localhost:3001/${ws}?view=backlog`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="backlog-view"]', { timeout: 10_000 })

    // bulk checkbox を 2 件選択
    for (const id of ids.slice(0, 2)) {
      const cb = page.locator(`[data-testid="bulk-select-${id}"]`)
      if (await cb.count()) await cb.check()
    }

    // BulkActionBar が表示されるのを待つ
    await page.waitForSelector('[data-testid="bulk-action-bar"]', { timeout: 5_000 })

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)

    const barMetrics = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="bulk-action-bar"]') as HTMLElement | null
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        left: Math.round(r.left),
        right: Math.round(r.right),
      }
    })
    console.log(`[bar] ${JSON.stringify(barMetrics)}`)
    if (barMetrics) {
      if (barMetrics.left < 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `bulk-action-bar.left=${barMetrics.left}px < 0 (viewport 左端を超えている)`,
        })
      }
      if (barMetrics.right > viewW + 4) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `bulk-action-bar.right=${barMetrics.right}px > viewport ${viewW}px (overflow)`,
        })
      }
    }

    const buttons = await page
      .locator('[data-testid="bulk-action-bar"] button')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return {
            testid: el.getAttribute('data-testid') ?? '',
            w: Math.round(r.width),
            h: Math.round(r.height),
          }
        }),
      )
    console.log(`[bar buttons] count=${buttons.length}`)
    for (const b of buttons) {
      console.log(`  ${b.testid}: ${b.w}x${b.h}`)
      if (b.h < 44 || b.w < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${b.testid}: ${b.w}x${b.h} < 44x44 (tap target 不足)`,
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-bulk-action-bar-iter1025.png', fullPage: true })
  },
})

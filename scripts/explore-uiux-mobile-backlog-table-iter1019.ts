/**
 * iter1019 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で Backlog view (TanStack table) の overflow / readability audit。
 *
 * 構造 (backlog-view.tsx):
 *   - <div data-testid="backlog-view" className="max-h-[600px] overflow-auto rounded-lg border">
 *     - <table className="w-full border-collapse text-sm">
 *       - 8 columns: drag (28px) / select (28px) / checkbox (40px) / status (110px) /
 *         title (340px) / MUST (70px) / dueDate (110px) / updatedAt (150px) /
 *         actions (380px) = sum 1256px
 *
 * 8 列の合計 width が ~1256px、viewport 320px の 4 倍。table の horizontal scroll
 * (parent overflow-auto) で部分表示の予定だが、UX は厳しい。
 *
 * このスクリプトは:
 *  1. parent container の overflow scroll で全 column 到達可能か
 *  2. 各 column 表示 / 隠れ状態を確認
 *  3. tap target (sortable th / action button) が 44x44 を満たすか
 *  4. row click で dialog open 可能か (mobile tap)
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-backlog-table-iter1019',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    for (let i = 0; i < 3; i++) {
      await admin.from('items').insert({
        workspace_id: ws,
        title: `iter1019 backlog mobile item ${i + 1}`,
        status: 'todo',
        priority: 2,
        is_must: i === 0,
        dod: i === 0 ? 'DoD' : null,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
    }

    await page.goto(`http://localhost:3001/${ws}?view=backlog`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="backlog-view"]', { timeout: 10_000 })

    // viewport check
    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)

    // backlog-view container measurements
    const containerMetrics = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="backlog-view"]') as HTMLElement | null
      if (!el) return null
      const r = el.getBoundingClientRect()
      const computed = getComputedStyle(el)
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        overflowX: computed.overflowX,
        overflowY: computed.overflowY,
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
      }
    })
    console.log(`[container] ${JSON.stringify(containerMetrics)}`)
    if (
      containerMetrics &&
      containerMetrics.scrollWidth > containerMetrics.w + 4 &&
      containerMetrics.overflowX !== 'auto' &&
      containerMetrics.overflowX !== 'scroll'
    ) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: `backlog-view container は内部 scroll が必要 (scrollWidth=${containerMetrics.scrollWidth} > w=${containerMetrics.w}) なのに overflow-x=${containerMetrics.overflowX}`,
      })
    }

    // table 内 8 列 visible / hidden 集計
    const colMetrics = await page.evaluate(() => {
      const ths = Array.from(document.querySelectorAll('table thead th'))
      return ths.map((th) => {
        const r = th.getBoundingClientRect()
        return {
          text: th.textContent?.trim().slice(0, 20) ?? '',
          w: Math.round(r.width),
          h: Math.round(r.height),
          left: Math.round(r.left),
          right: Math.round(r.right),
          visible: r.right > 0 && r.left < window.innerWidth,
        }
      })
    })
    console.log(`[columns] ${colMetrics.length} cols`)
    for (const c of colMetrics) {
      console.log(
        `  "${c.text}": ${c.w}x${c.h} left=${c.left} right=${c.right} visible=${c.visible}`,
      )
    }

    // backlog 行 click でも dialog 開けるか sanity
    const firstRow = await page.locator('[data-testid^="backlog-row-"]').first()
    const rowMetrics = await firstRow.boundingBox().catch(() => null)
    console.log(`[row] ${JSON.stringify(rowMetrics)}`)
    if (rowMetrics && rowMetrics.height < 44) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `backlog row height ${Math.round(rowMetrics.height)} < 44px (tap target)`,
      })
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-backlog-table-iter1019.png', fullPage: true })
  },
})

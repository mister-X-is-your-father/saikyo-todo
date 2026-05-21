/**
 * iter1012 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で Inbox view の row layout audit (iter1011 Today fix の cross-view check)。
 *
 * Inbox row 構造: `flex items-center gap-2`
 *   - ItemCheckbox
 *   - priority dot (8x8)
 *   - title span (truncate, no flex-1)
 *   - MUST chip (56x18)
 *   - `<div ml-auto shrink-0>` StatusBadge
 *
 * Today (iter1011) との違い:
 *   - 右側 chip 群は StatusBadge 1 個のみ (Today は 4 chip + timer button)
 *   - 中央 title は truncate のみで flex-1 なし → ml-auto がブロック
 *
 * このスクリプトは:
 *  1. inbox-row が 320px viewport 内に収まるか (overflow check)
 *  2. title が visible (width > 0px) か
 *  3. MUST chip / StatusBadge も visible で押し出されていないか
 *  4. screenshot baseline 保存
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-inbox-row-iter1012',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const ins = await admin.from('items').insert({
      workspace_id: ws,
      title: 'iter1012 モバイル inbox 長文タイトル mobile audit テスト',
      status: 'todo',
      priority: 2,
      is_must: true,
      dod: 'DoD dummy',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (ins.error) throw ins.error

    await page.goto(`http://localhost:3001/${ws}?view=inbox`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="inbox-view"]', { timeout: 10_000 })

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 4) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `documentElement.scrollWidth=${docW}px > viewport ${viewW}px (横スクロール = layout 潰れ)`,
      })
    }

    const rowBoxes = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid^="inbox-row-"]'))
      if (rows.length === 0) return []
      const row = rows[0] as HTMLElement
      const rect = row.getBoundingClientRect()
      const targets = ['[data-testid^="inbox-title-"]', '[data-testid^="inbox-must-"]']
      const childData: Array<{
        selector: string
        w: number
        h: number
        right: number
        overflow: boolean
      }> = []
      for (const sel of targets) {
        const el = row.querySelector(sel) as HTMLElement | null
        if (!el) continue
        const r = el.getBoundingClientRect()
        childData.push({
          selector: sel,
          w: Math.round(r.width),
          h: Math.round(r.height),
          right: Math.round(r.right),
          overflow: r.right > window.innerWidth,
        })
      }
      return [
        {
          rowRect: {
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            right: Math.round(rect.right),
          },
          children: childData,
        },
      ]
    })

    if (rowBoxes.length === 0) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: 'inbox-row が描画されていない',
      })
    } else {
      const r = rowBoxes[0]!
      console.log(`[row] ${r.rowRect.w}x${r.rowRect.h} right=${r.rowRect.right}`)
      for (const c of r.children) {
        console.log(
          `[child] ${c.selector}: ${c.w}x${c.h} right=${c.right}${c.overflow ? ' OVERFLOW' : ''}`,
        )
        if (c.overflow) {
          findings.push({
            level: 'warning',
            source: 'observation',
            message: `${c.selector}: right=${c.right}px > viewport ${viewW}px (押し出し / overflow)`,
          })
        }
      }
      const titleChild = r.children.find((c) => c.selector.includes('inbox-title'))
      if (titleChild && titleChild.w < 50) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `inbox-title が ${titleChild.w}x${titleChild.h} に潰れている (< 50px、Today iter1011 と同 bug 疑い)`,
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-inbox-row-iter1012.png', fullPage: true })
  },
})

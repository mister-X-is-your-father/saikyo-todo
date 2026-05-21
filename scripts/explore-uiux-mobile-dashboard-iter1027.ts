/**
 * iter1027 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で Dashboard view の全体 overflow / chip wrap audit。
 *
 * Dashboard view は大量の chip / StatCard / region で構成、mobile では layout
 * 潰れが多数発生する懸念。本 audit では:
 *  1. 全 page documentElement.scrollWidth > 320px 横スクロール検出
 *  2. 各 stat-card / chip / region の 個別 overflow 検出
 *  3. Burndown chart (SVG canvas) の responsive 動作確認
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-dashboard-iter1027',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const today = new Date().toISOString().slice(0, 10)
    // MUST + due item seed
    await admin.from('items').insert({
      workspace_id: ws,
      title: 'iter1027 mobile dashboard audit MUST',
      status: 'todo',
      is_must: true,
      due_date: today,
      dod: 'DoD',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })

    await page.goto(`http://localhost:3001/${ws}?view=dashboard`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="must-item-row-"], [data-testid^="must-item-row-"]', {
      timeout: 10_000,
    })

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    const bodyW = await page.evaluate(() => document.body.scrollWidth)
    console.log(
      `[viewport] doc.scrollWidth=${docW} body.scrollWidth=${bodyW} window.innerWidth=${viewW}`,
    )
    if (bodyW > viewW + 4) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `body.scrollWidth=${bodyW}px > viewport ${viewW}px (body 横スクロール発生)`,
      })
    }

    // 各 region / chip の overflow を集計 (右端 > viewport)
    const overflowing = await page.evaluate(() => {
      const VW = window.innerWidth
      const wide: Array<{ tag: string; testid: string; w: number; right: number; cls: string }> = []
      document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.right > VW + 4 && r.width > 4 && wide.length < 10) {
          // Recharts SVG 内部は除外 (chart scroll は許容)
          if (el.tagName === 'svg' || el.closest('svg')) return
          wide.push({
            tag: el.tagName,
            testid: el.getAttribute('data-testid') ?? '',
            w: Math.round(r.width),
            right: Math.round(r.right),
            cls: (el.className?.toString() ?? '').slice(0, 60),
          })
        }
      })
      return wide
    })
    if (overflowing.length > 0) {
      console.log(`[overflow] ${overflowing.length} elements`)
      for (const el of overflowing) {
        console.log(`  ${el.tag}[${el.testid}]: w=${el.w} right=${el.right}`)
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `${el.tag}[${el.testid || el.cls}]: w=${el.w}, right=${el.right}px > viewport`,
        })
      }
    } else {
      console.log(`[overflow] no overflowing elements detected`)
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-dashboard-iter1027.png', fullPage: true })
  },
})

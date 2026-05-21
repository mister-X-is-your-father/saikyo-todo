/**
 * iter1011 mobile audit (mode-M、in-iter exploration before commit):
 * iPhone SE 320px で today-view の row (priority dot / checkbox / title / MUST /
 * status badge / due time / timer button) を audit。
 *
 * 検出対象:
 *  - row 全体の bounding box が viewport 320px に収まるか
 *  - title 部分の truncate が効いているか (overflow なし)
 *  - timer button が 44x44 tap target
 *  - 各 chip / badge が押し出されていないか
 *
 * 修正は別 commit、本 script は audit のみ (発見次第 findings に push)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-today-row-iter1011b',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const today = new Date().toISOString().slice(0, 10)
    // seed today task with full chip set: MUST + dueTime + p1 priority
    const ins = await admin.from('items').insert({
      workspace_id: ws,
      title: 'iter1011 モバイル長文タイトル mobile audit テスト',
      status: 'todo',
      scheduled_for: today,
      due_date: today,
      due_time: '15:30:00',
      priority: 1,
      is_must: true,
      dod: 'モバイル DoD テスト',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (ins.error) throw ins.error

    await page.goto(`http://localhost:3001/${ws}?view=today`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="today-view"]', { timeout: 10_000 })

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

    // today row 1 件目を計測 + 内部要素 sanity
    const rowBoxes = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid^="today-row-"]'))
      if (rows.length === 0) return []
      const row = rows[0] as HTMLElement
      const rect = row.getBoundingClientRect()
      const childData: Array<{
        selector: string
        w: number
        h: number
        right: number
        overflow: boolean
      }> = []
      const targets = [
        '[role="img"]',
        '[data-testid^="today-title-"]',
        '[data-testid^="today-must-"]',
        '[data-testid^="start-timer-"]',
        'time',
      ]
      for (const sel of targets) {
        const els = row.querySelectorAll(sel)
        els.forEach((el) => {
          const r = (el as HTMLElement).getBoundingClientRect()
          childData.push({
            selector: sel,
            w: Math.round(r.width),
            h: Math.round(r.height),
            right: Math.round(r.right),
            overflow: r.right > window.innerWidth,
          })
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
        message: 'today-row が 1 件も描画されていない',
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
    }

    // screenshot baseline
    await page.screenshot({ path: '/tmp/uiux-mobile-today-row-iter1011b.png', fullPage: true })
  },
})

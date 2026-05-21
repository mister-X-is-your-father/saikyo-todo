/**
 * iter1020 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で SprintCard の button row (sprint card 内多 button) audit。
 *
 * SprintCard (sprints-panel.tsx) は status (planning / active / completed / cancelled) に
 * 応じて 4-6 button を 1 row に display:
 *   - 稼働開始 / 完了 / 計画に戻す / 中止 / 振り返り生成 / Pre-mortem / 期間編集
 *
 * 320px viewport では button row が hidden / overflow / cramped になる可能性、
 * これらは visible / tap target / wrap を確認する。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-sprint-card-iter1020',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    // active sprint を seed
    const startIso = new Date().toISOString().slice(0, 10)
    const endIso = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const ins = await admin
      .from('sprints')
      .insert({
        workspace_id: ws,
        name: 'iter1020 mobile sprint',
        start_date: startIso,
        end_date: endIso,
        status: 'active',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select()
      .single()
    if (ins.error || !ins.data) {
      // sprint test data 失敗時は exit early
      findings.push({
        level: 'info',
        source: 'observation',
        message: `sprint seed fail: ${ins.error?.message ?? 'no data'}`,
      })
      return
    }
    const sprintId = ins.data.id as string

    await page.goto(`http://localhost:3001/${ws}/sprints`, { waitUntil: 'networkidle' })
    await page.waitForSelector(`[data-testid="sprint-card-${sprintId}"]`, { timeout: 10_000 })

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 4) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `documentElement.scrollWidth=${docW}px > viewport ${viewW}px (page overflow)`,
      })
    }

    // sprint card 内の全 button を audit
    const sprintCardButtons = await page.evaluate((sId) => {
      const card = document.querySelector(
        `[data-testid="sprint-card-${sId}"]`,
      ) as HTMLElement | null
      if (!card) return null
      const buttons = Array.from(card.querySelectorAll('button')) as HTMLElement[]
      return buttons.map((b) => {
        const r = b.getBoundingClientRect()
        return {
          testid: b.getAttribute('data-testid') ?? '',
          ariaLabel: (b.getAttribute('aria-label') ?? '').slice(0, 50),
          w: Math.round(r.width),
          h: Math.round(r.height),
          right: Math.round(r.right),
          top: Math.round(r.top),
          overflow: r.right > window.innerWidth,
        }
      })
    }, sprintId)
    if (!sprintCardButtons || sprintCardButtons.length === 0) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: 'sprint-card 内 button が見つからない',
      })
    } else {
      console.log(`[sprint-card buttons] count=${sprintCardButtons.length}`)
      let below44 = 0
      let overflowed = 0
      for (const b of sprintCardButtons) {
        console.log(
          `  ${b.testid}: ${b.w}x${b.h} top=${b.top} right=${b.right}${b.overflow ? ' OVERFLOW' : ''}`,
        )
        if (b.h < 44 || b.w < 44) {
          below44 += 1
          findings.push({
            level: 'warning',
            source: 'a11y',
            message: `${b.testid}: ${b.w}x${b.h} < 44x44 (tap target 不足)`,
          })
        }
        if (b.overflow) {
          overflowed += 1
          findings.push({
            level: 'warning',
            source: 'observation',
            message: `${b.testid}: right=${b.right}px > viewport (overflow)`,
          })
        }
      }
      console.log(`[summary] below44: ${below44}, overflowed: ${overflowed}`)
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-sprint-card-iter1020.png', fullPage: true })
  },
})

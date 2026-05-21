/**
 * iter1028 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で WorkflowCard 内 5 button (実行 / 編集 / 有効化切替 / 履歴 / 削除) audit。
 *
 * WorkflowCard は flex-wrap で button が wrap される可能性が高い。
 * 5 button が viewport 内収まるか + 44x44 tap target satisfy か確認。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-workflow-card-iter1028',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const wf = await admin
      .from('workflows')
      .insert({
        workspace_id: ws,
        name: 'iter1028 mobile workflow audit',
        description: 'mobile UX',
        graph: { nodes: [], edges: [] },
        trigger: { kind: 'manual' },
        enabled: true,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select()
      .single()
    if (wf.error || !wf.data) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: `workflow seed fail: ${wf.error?.message ?? 'no data'}`,
      })
      return
    }
    const wfId = wf.data.id as string

    await page.goto(`http://localhost:3001/${ws}/workflows`, { waitUntil: 'networkidle' })
    await page.waitForSelector(`[data-testid="wf-card-${wfId}"]`, { timeout: 10_000 })

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
        message: `body.scrollWidth=${bodyW} > viewport ${viewW}`,
      })
    }

    const buttons = await page.evaluate((id) => {
      const card = document.querySelector(`[data-testid="wf-card-${id}"]`) as HTMLElement | null
      if (!card) return null
      return Array.from(card.querySelectorAll('button')).map((b) => {
        const r = b.getBoundingClientRect()
        return {
          testid: b.getAttribute('data-testid') ?? '',
          w: Math.round(r.width),
          h: Math.round(r.height),
          right: Math.round(r.right),
          top: Math.round(r.top),
        }
      })
    }, wfId)
    if (!buttons || buttons.length === 0) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: `wf-card 内 button 見つからない`,
      })
    } else {
      console.log(`[wf-card buttons] count=${buttons.length}`)
      for (const b of buttons) {
        console.log(`  ${b.testid}: ${b.w}x${b.h} top=${b.top} right=${b.right}`)
        if (b.h < 43 || b.w < 43) {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message: `${b.testid}: ${b.w}x${b.h} < 44x44`,
          })
        }
        if (b.right > viewW + 4) {
          findings.push({
            level: 'warning',
            source: 'observation',
            message: `${b.testid}: right=${b.right} > viewport (overflow)`,
          })
        }
      }
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-workflow-card-iter1028.png', fullPage: true })
  },
})

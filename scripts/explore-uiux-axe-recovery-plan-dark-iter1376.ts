/**
 * playwright-iter1376 (mode-D fix): iter1375 横展開。RecoveryPlanSection (overdue MUST
 * item の dialog base tab に出る「MUST 救済プラン」box) は container が `bg-rose-50/40` の
 * light 固定 tint で dark に追従せず、内部の theme-aware text (muted / rose-900) が dark で
 * contrast 割れする疑い。overdue MUST を seed → dialog base tab を dark で scan して確認。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-recovery-plan-dark-iter1376.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-recovery-plan-dark-iter1376',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const overdue = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'overdue MUST 救済プラン audit',
      status: 'todo',
      priority: 1,
      is_must: true,
      start_date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10),
      due_date: overdue,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(700)

    const editBtn = page.locator('[data-testid^="backlog-edit-"]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'backlog-edit not found' })
      return
    }
    await editBtn.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.waitForTimeout(400)

    const recovery = page.locator('[data-testid="recovery-plan-section"]')
    console.log(`[recovery-plan-section] count=${await recovery.count()}`)

    await page.evaluate(AXE_SRC)
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe injected at runtime
      return await window.axe.run('[data-testid="recovery-plan-section"]', {
        runOnly: { type: 'rule', values: ['color-contrast'] },
      })
    })
    const viol = results.violations as Array<{
      nodes: Array<{
        html: string
        any: Array<{ data: { contrastRatio?: number; fgColor?: string; bgColor?: string } }>
      }>
    }>
    let total = 0
    for (const v of viol) {
      for (const node of v.nodes) {
        total++
        const d = node.any?.[0]?.data
        console.log(
          `  ${node.html.slice(0, 70)} | ${d?.contrastRatio} fg ${d?.fgColor} bg ${d?.bgColor}`,
        )
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `recovery-plan dark color-contrast: ${node.html.slice(0, 60)} (${d?.contrastRatio})`,
        })
      }
    }
    console.log(`[recovery-plan dark] color-contrast violations=${total}`)
  },
})

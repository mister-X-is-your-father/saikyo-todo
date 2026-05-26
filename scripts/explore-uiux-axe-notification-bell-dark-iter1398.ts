/**
 * playwright-iter1398 (mode-D 探索): dark theme で NotificationBell popover を
 * 複数 type の通知投入で render して axe scan。iter1366 は light のみ、iter1379 は
 * NotificationPreferences dialog (bell list ではない)。bell popover の type icon chip /
 * unread dot / hint chip / breakdown / timestamp の dark contrast は未踏。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-notification-bell-dark-iter1398.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-notification-bell-dark-iter1398',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('notifications').insert([
      {
        workspace_id: workspaceId,
        user_id: userId,
        type: 'heartbeat',
        payload: { stage: 'overdue', dueDate: '2026-05-20', daysUntilDue: -6, itemId: null },
      },
      {
        workspace_id: workspaceId,
        user_id: userId,
        type: 'mention',
        payload: { mentionedBy: '田中', preview: 'レビューお願いします', itemId: null },
      },
      {
        workspace_id: workspaceId,
        user_id: userId,
        type: 'sync-failure',
        payload: { source: 'Yamory', reason: 'タイムアウト' },
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    await page.locator('[data-testid="notification-bell"]').click()
    await page
      .waitForSelector('[data-testid="notification-item"]', { timeout: 5000 })
      .catch(() => {})
    await page.waitForTimeout(400)
    const n = await page.locator('[data-testid="notification-item"]').count()
    console.log(`[notification items] ${n}`)

    await page.evaluate(AXE_SRC)
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe injected at runtime
      return await window.axe.run(
        '[data-testid="notification-bell-heading"], [role="dialog"], .w-80',
        {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
          },
        },
      )
    })
    const viol = results.violations as Array<{
      id: string
      impact: string
      nodes: Array<{
        html: string
        any: Array<{ data: { contrastRatio?: number; fgColor?: string; bgColor?: string } }>
      }>
    }>
    const interesting = viol.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    console.log(
      `\n[dark notification-bell] violations=${viol.length} (serious/critical=${interesting.length})`,
    )
    for (const v of viol) {
      const d = v.nodes[0]?.any?.[0]?.data
      console.log(
        `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 80)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
      )
      findings.push({
        level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
        source: 'a11y',
        message: `dark notification-bell ${v.impact} ${v.id} ×${v.nodes.length}`,
      })
    }
  },
})

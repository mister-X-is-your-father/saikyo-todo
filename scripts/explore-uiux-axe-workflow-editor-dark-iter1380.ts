/**
 * playwright-iter1380 (mode-D 探索): dark theme で WorkflowEditorDialog
 * (React Flow graph canvas + trigger/graph JSON textarea) を開いて axe scan。
 *
 * iter1362 は light で workflow editor を 0 にしたが dark は未踏。graph canvas の
 * node / edge 配色や JSON textarea が dark で contrast 割れしないか確認。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-workflow-editor-dark-iter1380.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-workflow-editor-dark-iter1380',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('workflows').insert({
      workspace_id: workspaceId,
      name: 'dark editor audit workflow',
      description: 'audit 用',
      graph: {
        nodes: [
          { id: 'n1', type: 'noop', label: '開始', config: {} },
          { id: 'n2', type: 'slack', label: 'Slack 通知', config: {} },
        ],
        edges: [{ from: 'n1', to: 'n2' }],
      },
      trigger: { kind: 'manual' },
      enabled: true,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    const editBtn = page.locator('[data-testid^="wf-edit-"]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'wf-edit button not found' })
      return
    }
    await editBtn.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.waitForTimeout(700)

    await page.evaluate(AXE_SRC)
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe injected at runtime
      return await window.axe.run('[role="dialog"]', {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
        },
      })
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
      `\n[dark workflow-editor] violations=${viol.length} (serious/critical=${interesting.length})`,
    )
    for (const v of viol) {
      const d = v.nodes[0]?.any?.[0]?.data
      console.log(
        `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 80)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
      )
      findings.push({
        level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
        source: 'a11y',
        message: `dark workflow-editor ${v.impact} ${v.id} ×${v.nodes.length}`,
      })
    }
  },
})

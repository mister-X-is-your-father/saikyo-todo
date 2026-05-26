/**
 * playwright-iter1381 (mode-D 探索): dark theme で DecomposeProposalsPanel
 * (subtasks tab に出る AI 分解候補カード群) を pending proposal seed で render して axe scan。
 *
 * iter1371 で同 panel の MUST label dark contrast は潰したが、panel 全体 (proposal card /
 * 編集 form / accept/reject button / tint) の dark scan は未踏。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-decompose-proposals-dark-iter1381.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-decompose-proposals-dark-iter1381',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const it = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: '分解候補 audit 親 item',
        status: 'todo',
        priority: 2,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (it.data) {
      await admin.from('agent_decompose_proposals').insert([
        {
          workspace_id: workspaceId,
          parent_item_id: it.data.id,
          title: '子タスク候補 A (MUST)',
          description: 'これは AI が提案した子タスクの説明です',
          is_must: true,
          dod: '完了条件のテキスト',
          status_proposal: 'pending',
          sort_order: 0,
        },
        {
          workspace_id: workspaceId,
          parent_item_id: it.data.id,
          title: '子タスク候補 B',
          description: '2 つ目の提案',
          is_must: false,
          status_proposal: 'pending',
          sort_order: 1,
        },
      ])
    }
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
    const subtab = page.locator('[data-testid="tab-subtasks"]').first()
    if ((await subtab.count()) > 0) {
      await subtab.click()
      await page.waitForTimeout(700)
    }
    const proposalCount = await page.locator('[data-testid^="decompose-proposals-panel"]').count()
    console.log(`[decompose proposals] count=${proposalCount}`)

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
      `\n[dark decompose-proposals] violations=${viol.length} (serious/critical=${interesting.length})`,
    )
    for (const v of viol) {
      const d = v.nodes[0]?.any?.[0]?.data
      console.log(
        `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 80)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
      )
      findings.push({
        level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
        source: 'a11y',
        message: `dark decompose ${v.impact} ${v.id} ×${v.nodes.length}`,
      })
    }
  },
})

/**
 * playwright-iter1409 (mode-D 探索): /goals (OKR: goal + key_results 進捗バー) と /sprints
 * (sprint card / 進捗) を **populated** で light + dark の axe scan。これらの populated 状態は
 * iter1404-1408 sweep の非対象 (empty のみ)。manual KR を 0% / 30% / 100% で混ぜ health tier /
 * progress bar の contrast を見る。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-goals-sprints-populated-iter1409.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

async function scan(
  page: import('@playwright/test').Page,
  label: string,
  findings: import('./lib/explore-uiux-runner').Finding[],
) {
  await page.evaluate(AXE_SRC)
  const results = await page.evaluate(async () => {
    // @ts-expect-error axe injected at runtime
    return await window.axe.run(document, {
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
  console.log(`\n[${label}] violations=${viol.length}`)
  for (const v of viol) {
    const d = v.nodes[0]?.any?.[0]?.data
    console.log(
      `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 110)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
    )
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-goals-sprints-populated-iter1409',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const today = new Date()
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const start = new Date(today.getTime() - 7 * 86400_000)
    const end = new Date(today.getTime() + 7 * 86400_000)
    // goal + key results (manual 0/30/100%)
    const g = await admin
      .from('goals')
      .insert({
        workspace_id: workspaceId,
        title: '四半期目標: リリース品質を上げる',
        description: 'バグ削減と自動化',
        period: 'quarterly',
        start_date: iso(start),
        end_date: iso(end),
        status: 'active',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
    const goalId = g.data?.[0]?.id
    if (g.error) console.error('[seed] goal err', g.error.message)
    if (goalId) {
      const krs = [
        {
          title: 'E2E カバレッジ 80%',
          current_value: 80,
          target_value: 80,
          unit: '%',
          position: 0,
        },
        {
          title: 'バグ再オープン率 5% 以下',
          current_value: 3,
          target_value: 10,
          unit: '%',
          position: 1,
        },
        { title: '新規 flaky test 0', current_value: 0, target_value: 5, unit: '件', position: 2 },
      ]
      for (const k of krs) {
        const { error } = await admin
          .from('key_results')
          .insert({ goal_id: goalId, progress_mode: 'manual', weight: 1, ...k })
        if (error) console.error('[seed] kr err', error.message)
      }
    }
    // active sprint
    const s = await admin.from('sprints').insert({
      workspace_id: workspaceId,
      name: 'Sprint 12',
      goal: 'リリース準備',
      start_date: iso(start),
      end_date: iso(end),
      status: 'active',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (s.error) console.error('[seed] sprint err', s.error.message)
  },
  body: async ({ page, workspaceId, findings }) => {
    for (const theme of ['light', 'dark']) {
      await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
      await page.evaluate((t) => localStorage.setItem('theme', t), theme)
      for (const sub of ['goals', 'sprints']) {
        await page.goto(`http://localhost:3001/${workspaceId}/${sub}`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(1000)
        await scan(page, `${theme} /${sub}`, findings)
      }
    }
  },
})

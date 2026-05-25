/**
 * playwright-iter1355: mobile (iPhone SE 320px) all-WCAG axe scan の regression guard。
 *
 * mode-M script 群 (iter1310-1324) は tap target 寸法のみ検証していた。本 script は
 * mobile viewport で axe 全 WCAG rule を流し、contrast / 構造系の mobile 固有
 * regression を検出する。home / backlog は clean。
 *
 * ⏳ deferred (本 guard では kanban を除外): kanban card は dnd-kit useSortable の
 *   `{...attributes}` (role="button" tabindex=0) を card 全体に spread しつつ内部に
 *   focusable 子 (ItemCheckbox / title button / edit button / count) を持つため
 *   serious nested-interactive。修正には drag を card 全体から専用 drag handle
 *   (backlog-view は既に `<DragHandle/>` 採用) へ移す DnD 挙動変更が必要で、
 *   reorder 機能を壊さない検証が loop 内では困難なため別 design iter に委ねる。
 *   kanban 列見出しの contrast は iter1354 で解消済。
 *
 * 探索 script (経路 B)。
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
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })
  })
  const viol = results.violations as Array<{
    id: string
    impact: string
    nodes: Array<{ html: string }>
  }>
  console.log(`\n[${label}] violations=${viol.length}`)
  for (const v of viol) {
    console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 60)}`)
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-scan-mobile-iter1355',
  device: 'iPhone SE',
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'mobile audit item',
      status: 'todo',
      is_must: true,
      due_date: t,
      scheduled_for: t,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await scan(page, 'mobile home', findings)
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(700)
    await scan(page, 'mobile backlog', findings)
  },
})

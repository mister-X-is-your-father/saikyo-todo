/**
 * Phase 6.15 loop iter 1005 — taskchute-view (empty 状態) / budget-panel /
 * team-context-editor / top-items-by-time-chip の bare Card 4 件に
 * role="region" + aria-labelledby 付与 (iter1002-1004 sweep 続編、累積 14 Card)。
 *
 * - taskchute-view (empty 状態 Card) → id="taskchute-empty-heading"
 *   (populated Card は既に role="region" + aria-label 持ち、iter1005 では empty 系の gap を補完)
 * - budget-panel "AI 月次コスト" → id="budget-panel-heading"
 * - team-context-editor "チームコンテキスト (AI プロンプトに inject)" → id="team-context-editor-heading"
 * - top-items-by-time-chip "直近 {N} 日 稼働ダッシュボード" → id="top-items-by-time-heading"
 *
 * 各 Card +3 行、合計 ~16 行 (4 file)。shadcn 編集無し、視覚 / DOM / 動作不変。
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const checks: Array<{ file: string; pattern: RegExp; label: string }> = [
    {
      file: 'src/components/workspace/taskchute-view.tsx',
      pattern: /aria-labelledby="taskchute-empty-heading"[\s\S]{0,400}id="taskchute-empty-heading"/,
      label: 'taskchute-view empty Card region',
    },
    {
      file: 'src/components/workspace/budget-panel.tsx',
      pattern: /aria-labelledby="budget-panel-heading"[\s\S]{0,400}id="budget-panel-heading"/,
      label: 'budget-panel Card region',
    },
    {
      file: 'src/components/workspace/team-context-editor.tsx',
      pattern:
        /aria-labelledby="team-context-editor-heading"[\s\S]{0,400}id="team-context-editor-heading"/,
      label: 'team-context-editor Card region',
    },
    {
      file: 'src/components/time-entry/top-items-by-time-chip.tsx',
      pattern:
        /aria-labelledby="top-items-by-time-heading"[\s\S]{0,400}id="top-items-by-time-heading"/,
      label: 'top-items-by-time Card region',
    },
  ]

  for (const c of checks) {
    const src = readFileSync(resolve(process.cwd(), c.file), 'utf8')
    if (c.pattern.test(src)) {
      findings.push({ level: 'info', message: `${c.label} OK` })
    } else {
      findings.push({ level: 'warning', message: `${c.label} 不在 (期待: ${c.pattern})` })
    }
  }

  // iter1002-1004 累積 10 Card invariants
  const checks2: Array<{ file: string; pattern: RegExp; label: string }> = [
    {
      file: 'src/components/workspace/items-board.tsx',
      pattern: /aria-labelledby="items-board-quick-add-heading"/,
      label: 'iter1002 items-board',
    },
    {
      file: 'src/components/time-entry/time-entries-panel.tsx',
      pattern: /aria-labelledby="time-entries-new-heading"/,
      label: 'iter1002 time-entries-new',
    },
    {
      file: 'src/components/time-entry/time-entries-panel.tsx',
      pattern: /aria-labelledby="time-entries-list-heading"/,
      label: 'iter1002 time-entries-list',
    },
    {
      file: 'src/components/workspace/sprints-panel.tsx',
      pattern: /aria-labelledby="sprints-new-heading"/,
      label: 'iter1003 sprints-new',
    },
    {
      file: 'src/components/workspace/sprints-panel.tsx',
      pattern: /aria-labelledby="sprint-defaults-heading"/,
      label: 'iter1003 sprint-defaults',
    },
    {
      file: 'src/components/workspace/goals-panel.tsx',
      pattern: /aria-labelledby="goals-new-heading"/,
      label: 'iter1003 goals-new',
    },
    {
      file: 'src/components/workspace/pdca-panel.tsx',
      pattern: /aria-labelledby="pdca-panel-heading"/,
      label: 'iter1004 pdca-panel',
    },
    {
      file: 'src/components/template/templates-panel.tsx',
      pattern: /aria-labelledby="templates-new-heading"/,
      label: 'iter1004 templates-new',
    },
    {
      file: 'src/components/workflow/workflows-panel.tsx',
      pattern: /aria-labelledby="workflows-new-heading"/,
      label: 'iter1004 workflows-new',
    },
    {
      file: 'src/components/integrations/integrations-panel.tsx',
      pattern: /aria-labelledby="integrations-new-source-heading"/,
      label: 'iter1004 integrations-new-source',
    },
  ]
  for (const c of checks2) {
    const src = readFileSync(resolve(process.cwd(), c.file), 'utf8')
    if (c.pattern.test(src)) {
      findings.push({ level: 'info', message: `${c.label} invariant OK` })
    } else {
      findings.push({ level: 'warning', message: `${c.label} invariant 破壊` })
    }
  }

  console.log(`\n=== Findings (card-region-role-iter1005) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

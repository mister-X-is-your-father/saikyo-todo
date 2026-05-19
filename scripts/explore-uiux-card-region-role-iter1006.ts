/**
 * Phase 6.15 loop iter 1006 — estimate-bias-insight (loading + populated) /
 * personal-period-view の bare Card 3 件に role="region" + aria-labelledby 付与
 * (iter1002-1005 sweep 続編、累積 17 Card region 化)。
 *
 * - estimate-bias-insight loading → id="estimate-bias-insight-loading-heading"
 * - estimate-bias-insight populated → id="estimate-bias-insight-heading"
 * - personal-period-view "ゴール" Card (period 動的、template literal id) →
 *   id={`personal-period-goal-heading-${period}`}
 *
 * 各 Card +3 行、合計 ~15 行 (2 file)。shadcn 編集無し、視覚 / DOM / 動作不変。
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
      file: 'src/components/time-entry/estimate-bias-insight.tsx',
      pattern:
        /aria-labelledby="estimate-bias-insight-loading-heading"[\s\S]{0,400}id="estimate-bias-insight-loading-heading"/,
      label: 'estimate-bias-insight loading Card region',
    },
    {
      file: 'src/components/time-entry/estimate-bias-insight.tsx',
      pattern:
        /aria-labelledby="estimate-bias-insight-heading"[\s\S]{0,400}id="estimate-bias-insight-heading"/,
      label: 'estimate-bias-insight populated Card region',
    },
    {
      file: 'src/components/workspace/personal-period-view.tsx',
      pattern:
        /aria-labelledby=\{`personal-period-goal-heading-\$\{period\}`\}[\s\S]{0,400}id=\{`personal-period-goal-heading-\$\{period\}`\}/,
      label: 'personal-period-view goal Card region',
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

  // iter1005 4 Card invariants (taskchute-empty / budget / team-context / top-items)
  const inv: Array<{ file: string; pat: RegExp; label: string }> = [
    {
      file: 'src/components/workspace/taskchute-view.tsx',
      pat: /aria-labelledby="taskchute-empty-heading"/,
      label: 'iter1005 taskchute-empty',
    },
    {
      file: 'src/components/workspace/budget-panel.tsx',
      pat: /aria-labelledby="budget-panel-heading"/,
      label: 'iter1005 budget-panel',
    },
    {
      file: 'src/components/workspace/team-context-editor.tsx',
      pat: /aria-labelledby="team-context-editor-heading"/,
      label: 'iter1005 team-context-editor',
    },
    {
      file: 'src/components/time-entry/top-items-by-time-chip.tsx',
      pat: /aria-labelledby="top-items-by-time-heading"/,
      label: 'iter1005 top-items-by-time',
    },
  ]
  for (const i of inv) {
    const src = readFileSync(resolve(process.cwd(), i.file), 'utf8')
    if (i.pat.test(src)) {
      findings.push({ level: 'info', message: `${i.label} invariant OK` })
    } else {
      findings.push({ level: 'warning', message: `${i.label} invariant 破壊` })
    }
  }

  console.log(`\n=== Findings (card-region-role-iter1006) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

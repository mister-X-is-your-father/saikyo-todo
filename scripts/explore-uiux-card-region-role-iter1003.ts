/**
 * Phase 6.15 loop iter 1003 — sprints-panel + goals-panel の bare Card 3 件に
 * role="region" + aria-labelledby 付与 (iter1002 sweep 続編)。
 *
 * 課題: iter1002 で items-board / time-entries-panel の 3 Card を region 化したが、
 *   sprints-panel "新規 Sprint" / "Sprint デフォルト (workspace 全体)" /
 *   goals-panel "新規 Goal (Objective)" 各 top-level Card は bare のまま残存。
 *
 * fix:
 *   1. sprints-panel.tsx "新規 Sprint" Card → id="sprints-new-heading"
 *   2. sprints-panel.tsx "Sprint デフォルト (workspace 全体)" Card →
 *      id="sprint-defaults-heading"
 *   3. goals-panel.tsx "新規 Goal (Objective)" Card → id="goals-new-heading"
 *
 *   各 Card +3 行 (role + aria-labelledby + CardTitle id 多行化)、合計 ~12 行。
 *   shadcn 編集無し、視覚 / DOM / 動作不変。
 *
 *   SR landmark nav (rotor) で 3 panel 識別可能化、iter1002 sweep 累積 6 Card。
 *
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
      file: 'src/components/workspace/sprints-panel.tsx',
      pattern:
        /<Card role="region" aria-labelledby="sprints-new-heading">[\s\S]{0,200}id="sprints-new-heading"/,
      label: 'sprints-panel new Card region',
    },
    {
      file: 'src/components/workspace/sprints-panel.tsx',
      pattern: /aria-labelledby="sprint-defaults-heading"[\s\S]{0,400}id="sprint-defaults-heading"/,
      label: 'sprints-panel defaults Card region',
    },
    {
      file: 'src/components/workspace/goals-panel.tsx',
      pattern:
        /<Card role="region" aria-labelledby="goals-new-heading">[\s\S]{0,200}id="goals-new-heading"/,
      label: 'goals-panel new Card region',
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

  // iter1002 invariants
  const itemsBoardSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/aria-labelledby="items-board-quick-add-heading"/.test(itemsBoardSrc)) {
    findings.push({ level: 'info', message: 'iter1002 items-board invariant OK' })
  } else {
    findings.push({ level: 'warning', message: 'iter1002 items-board invariant 破壊' })
  }

  const teSrc = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-panel.tsx'),
    'utf8',
  )
  if (
    /aria-labelledby="time-entries-new-heading"/.test(teSrc) &&
    /aria-labelledby="time-entries-list-heading"/.test(teSrc)
  ) {
    findings.push({ level: 'info', message: 'iter1002 time-entries invariants OK' })
  } else {
    findings.push({ level: 'warning', message: 'iter1002 time-entries invariants 破壊' })
  }

  console.log(`\n=== Findings (card-region-role-iter1003) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

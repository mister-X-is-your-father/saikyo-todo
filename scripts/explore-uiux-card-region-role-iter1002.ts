/**
 * Phase 6.15 loop iter 1002 — items-board + time-entries-panel の bare Card に
 * role="region" + aria-labelledby 付与 (iter1000 hint「Card region role sweep」着手)。
 *
 * 課題: shadcn <Card> は default で role / landmark を持たず、CardTitle の visible
 *   text があっても SR landmark navigation で discoverable でない。iter925-931 sweep
 *   で DataWidgetCard / dashboard-burndown / MUST 一覧 等 1 source 集約済 だが、
 *   items-board "新規 Item (クイック追加)" Card / time-entries-panel "新規 稼働記録"
 *   "一覧" Card は bare のままで landmark gap が残存。
 *
 * fix:
 *   1. items-board.tsx "新規 Item (クイック追加)" Card → role="region" +
 *      aria-labelledby="items-board-quick-add-heading", CardTitle に id 同名付与
 *   2. time-entries-panel.tsx "新規 稼働記録" Card → role="region" +
 *      aria-labelledby="time-entries-new-heading"
 *   3. time-entries-panel.tsx "一覧" Card → role="region" +
 *      aria-labelledby="time-entries-list-heading"
 *
 *   各 Card +3 行 (role + aria-labelledby + CardTitle id 多行化)、合計 ~15 行。
 *   shadcn 編集無し、視覚 / DOM / 動作不変。
 *
 *   SR landmark nav (rotor) で 3 panel 識別可能化 (workspace dashboard 内 +
 *   time-entries 内 で sub-landmark 増加)。
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
      file: 'src/components/workspace/items-board.tsx',
      pattern:
        /<Card role="region" aria-labelledby="items-board-quick-add-heading">[\s\S]{0,200}id="items-board-quick-add-heading"/,
      label: 'items-board quick-add Card region',
    },
    {
      file: 'src/components/time-entry/time-entries-panel.tsx',
      pattern:
        /<Card role="region" aria-labelledby="time-entries-new-heading">[\s\S]{0,200}id="time-entries-new-heading"/,
      label: 'time-entries new Card region',
    },
    {
      file: 'src/components/time-entry/time-entries-panel.tsx',
      pattern:
        /<Card role="region" aria-labelledby="time-entries-list-heading">[\s\S]{0,200}id="time-entries-list-heading"/,
      label: 'time-entries list Card region',
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

  // existing region invariant: dashboard burndown / MUST item region (iter929)
  const dashboardView = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (/<Card role="region" aria-labelledby="dashboard-burndown-heading"/.test(dashboardView)) {
    findings.push({ level: 'info', message: 'iter929 dashboard-burndown invariant OK' })
  } else {
    findings.push({ level: 'warning', message: 'iter929 dashboard-burndown invariant 破壊' })
  }

  console.log(`\n=== Findings (card-region-role-iter1002) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

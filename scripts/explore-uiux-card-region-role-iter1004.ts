/**
 * Phase 6.15 loop iter 1004 — pdca-panel / templates-panel / workflows-panel /
 * integrations-panel の bare Card 4 件に role="region" + aria-labelledby 付与
 * (iter1002/1003 sweep 続編、累積 10 Card region 化)。
 *
 * - pdca-panel "PDCA ({days} 日間)" → id="pdca-panel-heading"
 * - templates-panel "新規 Template" → id="templates-new-heading"
 * - workflows-panel "新規 Workflow" → id="workflows-new-heading"
 * - integrations-panel "新規 Source" → id="integrations-new-source-heading"
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
      file: 'src/components/workspace/pdca-panel.tsx',
      pattern: /aria-labelledby="pdca-panel-heading"[\s\S]{0,400}id="pdca-panel-heading"/,
      label: 'pdca-panel Card region',
    },
    {
      file: 'src/components/template/templates-panel.tsx',
      pattern: /aria-labelledby="templates-new-heading"[\s\S]{0,400}id="templates-new-heading"/,
      label: 'templates-panel new Card region',
    },
    {
      file: 'src/components/workflow/workflows-panel.tsx',
      pattern: /aria-labelledby="workflows-new-heading"[\s\S]{0,400}id="workflows-new-heading"/,
      label: 'workflows-panel new Card region',
    },
    {
      file: 'src/components/integrations/integrations-panel.tsx',
      pattern:
        /aria-labelledby="integrations-new-source-heading"[\s\S]{0,400}id="integrations-new-source-heading"/,
      label: 'integrations-panel new-source Card region',
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

  // iter1002/1003 invariants
  const itemsBoardSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const goalsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  for (const inv of [
    {
      src: itemsBoardSrc,
      pat: /aria-labelledby="items-board-quick-add-heading"/,
      label: 'iter1002 items-board',
    },
    {
      src: sprintsSrc,
      pat: /aria-labelledby="sprints-new-heading"/,
      label: 'iter1003 sprints-new',
    },
    {
      src: sprintsSrc,
      pat: /aria-labelledby="sprint-defaults-heading"/,
      label: 'iter1003 sprint-defaults',
    },
    { src: goalsSrc, pat: /aria-labelledby="goals-new-heading"/, label: 'iter1003 goals-new' },
  ]) {
    if (inv.pat.test(inv.src)) {
      findings.push({ level: 'info', message: `${inv.label} invariant OK` })
    } else {
      findings.push({ level: 'warning', message: `${inv.label} invariant 破壊` })
    }
  }

  console.log(`\n=== Findings (card-region-role-iter1004) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

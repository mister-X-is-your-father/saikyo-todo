/**
 * Phase 6.15 loop iter 1007 — list-item dynamic Card 5 件に role="region" +
 * aria-labelledby (template literal id 使用) — iter1002-1006 sweep 続編、累積 22 Card。
 *
 * - SprintCard (sprints-panel list-item) → id={`sprint-card-heading-${sprint.id}`}
 * - GoalCard (goals-panel list-item) → id={`goal-card-heading-${goal.id}`}
 * - SourceCard (integrations-panel list-item) → id={`src-card-heading-${src.id}`}
 * - TemplateCard (templates-panel list-item) → id={`template-card-heading-${t.id}`}
 * - WorkflowCard (workflows-panel list-item) → id={`wf-card-heading-${wf.id}`}
 *
 * 各 Card +3 行、合計 ~20 行 (5 file)。shadcn 編集無し、視覚 / DOM / 動作不変。
 * SR rotor で list 内 各 entity Card を independent landmark として識別。
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
        /aria-labelledby=\{`sprint-card-heading-\$\{sprint\.id\}`\}[\s\S]{0,400}id=\{`sprint-card-heading-\$\{sprint\.id\}`\}/,
      label: 'SprintCard region',
    },
    {
      file: 'src/components/workspace/goals-panel.tsx',
      pattern:
        /aria-labelledby=\{`goal-card-heading-\$\{goal\.id\}`\}[\s\S]{0,1500}id=\{`goal-card-heading-\$\{goal\.id\}`\}/,
      label: 'GoalCard region',
    },
    {
      file: 'src/components/integrations/integrations-panel.tsx',
      pattern:
        /aria-labelledby=\{`src-card-heading-\$\{src\.id\}`\}[\s\S]{0,400}id=\{`src-card-heading-\$\{src\.id\}`\}/,
      label: 'SourceCard region',
    },
    {
      file: 'src/components/template/templates-panel.tsx',
      pattern:
        /aria-labelledby=\{`template-card-heading-\$\{t\.id\}`\}[\s\S]{0,1500}id=\{`template-card-heading-\$\{t\.id\}`\}/,
      label: 'TemplateCard region',
    },
    {
      file: 'src/components/workflow/workflows-panel.tsx',
      pattern:
        /aria-labelledby=\{`wf-card-heading-\$\{wf\.id\}`\}[\s\S]{0,400}id=\{`wf-card-heading-\$\{wf\.id\}`\}/,
      label: 'WorkflowCard region',
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

  // iter1006 invariants
  const ebSrc = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  if (/aria-labelledby="estimate-bias-insight-heading"/.test(ebSrc)) {
    findings.push({ level: 'info', message: 'iter1006 estimate-bias-insight invariant OK' })
  } else {
    findings.push({ level: 'warning', message: 'iter1006 estimate-bias-insight invariant 破壊' })
  }

  console.log(`\n=== Findings (card-region-role-iter1007) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

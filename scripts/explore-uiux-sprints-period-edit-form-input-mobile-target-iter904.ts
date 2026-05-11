/**
 * Phase 6.15 loop iter 904 (mode-M Mobile audit / iter889-903 follow-up) —
 * sprints-panel の Sprint 期間編集 form 2 date Input (edit-start / edit-end) を min-h-11 化。
 *
 * 検証: source-side regex assert + iter903 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const startOk =
    /data-testid=\{`sprint-edit-start-\$\{sprint\.id\}`\}|className="min-h-11 text-xs"/g.test(sp)
  const count = (sp.match(/className="min-h-11 text-xs"/g) ?? []).length
  if (count >= 2) {
    findings.push({
      level: 'info',
      message: `sprints-panel period 編集 2 date input min-h-11 適用 OK (${count} 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel period 編集 min-h-11 件数 ${count} (期待 ≥2)`,
    })
  }

  // iter903 invariant
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (
    /className="min-h-11 rounded border/.test(idp) &&
    /className="min-h-11 min-w-\[260px\]/.test(idp)
  ) {
    findings.push({
      level: 'info',
      message: `iter903 invariant: item-dependencies-panel 2 select 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter903 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprints-period-edit-form-input-mobile-target-iter904) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

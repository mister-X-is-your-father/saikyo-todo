/**
 * Phase 6.15 loop iter 902 (mode-M Mobile audit / iter889-901 follow-up) —
 * item-edit-dialog の残 3 input (editSprint select / editKr select / editDod IMEInput) を min-h-11 化。
 *
 * 検証: source-side regex assert + iter901 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const checks: Array<[RegExp, string]> = [
    [/id="editSprint"[\s\S]{0,400}className="min-h-11 w-full rounded border/, 'editSprint'],
    [/id="editKr"[\s\S]{0,400}className="min-h-11 w-full rounded border/, 'editKr'],
    [/id="editDod"[\s\S]{0,600}className="min-h-11"/, 'editDod'],
  ]
  for (const [re, label] of checks) {
    if (re.test(ied)) {
      findings.push({ level: 'info', message: `item-edit-dialog ${label} min-h-11 適用 OK` })
    } else {
      findings.push({ level: 'warning', message: `item-edit-dialog ${label} 未適用` })
    }
  }

  // iter901 invariant
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/id="sprint-defaults-dow"[\s\S]{0,400}className="min-h-11 rounded-md/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter901 invariant: sprints defaults-dow 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter901 invariant: 破壊` })
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

  console.log(`\n=== Findings (item-edit-dialog-sprint-kr-dod-mobile-target-iter902) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

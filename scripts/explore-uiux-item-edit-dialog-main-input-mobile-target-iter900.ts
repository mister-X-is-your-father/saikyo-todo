/**
 * Phase 6.15 loop iter 900 (mode-M Mobile audit / iter889-899 follow-up) —
 * item-edit-dialog 基本タブ主要 4 input (editTitle / editDescription / editStart / editDue) を
 * min-h-11 化。
 *
 * fix (1 ファイル 4 行差分): editTitle / editDescription / editStart / editDue。
 *
 * 検証: source-side regex assert + iter899 invariant cross-check。
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
    [/id="editTitle"[\s\S]{0,800}className="min-h-11"/, 'editTitle'],
    [/id="editDescription"[\s\S]{0,800}className="min-h-11"/, 'editDescription'],
    [/id="editStart"[\s\S]{0,400}className="min-h-11"/, 'editStart'],
    [/id="editDue"[\s\S]{0,400}className="min-h-11"/, 'editDue'],
  ]
  for (const [re, label] of checks) {
    if (re.test(ied)) {
      findings.push({ level: 'info', message: `item-edit-dialog ${label} min-h-11 適用 OK` })
    } else {
      findings.push({ level: 'warning', message: `item-edit-dialog ${label} min-h-11 未適用` })
    }
  }

  // iter899 invariant
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (/className="min-h-11 flex-1"/.test(tie)) {
    findings.push({
      level: 'info',
      message: `iter899 invariant: template-items-editor title min-h-11 flex-1 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter899 invariant: 破壊` })
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

  console.log(`\n=== Findings (item-edit-dialog-main-input-mobile-target-iter900) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

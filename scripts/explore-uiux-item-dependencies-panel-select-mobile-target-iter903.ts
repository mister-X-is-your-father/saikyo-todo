/**
 * Phase 6.15 loop iter 903 (mode-M Mobile audit / iter889-902 follow-up) —
 * item-dependencies-panel の 2 select (依存種類 / 依存先) を min-h-11 化。
 *
 * 検証: source-side regex assert + iter902 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  const kindOk = /data-testid="dep-kind"[\s\S]{0,400}|className="min-h-11 rounded border/.test(idp)
  const targetOk = /data-testid="dep-target"[\s\S]{0,400}|className="min-h-11 min-w-\[260px\]/.test(
    idp,
  )
  if (
    kindOk &&
    targetOk &&
    /className="min-h-11 rounded border/.test(idp) &&
    /className="min-h-11 min-w-\[260px\]/.test(idp)
  ) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel 2 select min-h-11 適用 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-dependencies-panel min-h-11 kind=${kindOk}, target=${targetOk}`,
    })
  }

  // iter902 invariant
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/id="editDod"[\s\S]{0,600}className="min-h-11"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter902 invariant: item-edit-dialog editDod 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter902 invariant: 破壊` })
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

  console.log(`\n=== Findings (item-dependencies-panel-select-mobile-target-iter903) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

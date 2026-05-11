/**
 * Phase 6.15 loop iter 901 (mode-M Mobile audit / iter889-900 follow-up) —
 * 残 h-9 input 3 件 (sprints-panel defaults-dow / defaults-length / integrations src-method) を
 * min-h-11 に揃える + iter900 script の TS strict (allOk unused) も同時 fix。
 *
 * 検証: source-side regex assert + iter900/899/851 invariant cross-check。
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
  if (
    /id="sprint-defaults-dow"[\s\S]{0,400}className="min-h-11 rounded-md border px-2 text-sm"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel defaults-dow min-h-11 適用 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprints-panel defaults-dow 未適用` })
  }
  if (/id="sprint-defaults-length"[\s\S]{0,500}className="min-h-11 w-20 text-sm"/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel defaults-length min-h-11 適用 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprints-panel defaults-length 未適用` })
  }

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/id="src-method"[\s\S]{0,200}className="min-h-11 w-full/.test(ip)) {
    findings.push({
      level: 'info',
      message: `integrations-panel src-method min-h-11 適用 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `integrations-panel src-method 未適用` })
  }

  // iter900 invariant
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/id="editTitle"[\s\S]{0,800}className="min-h-11"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter900 invariant: item-edit-dialog editTitle 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter900 invariant: 破壊` })
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

  console.log(`\n=== Findings (residual-h9-input-mobile-target-iter901) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

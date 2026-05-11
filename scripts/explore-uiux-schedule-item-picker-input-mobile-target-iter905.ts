/**
 * Phase 6.15 loop iter 905 (mode-M Mobile audit / iter889-904 follow-up) —
 * schedule-item-picker の 2 Input (search / interrupt-note) を min-h-11 化。
 *
 * 検証: source-side regex assert + iter904 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  const count = (sip.match(/className="min-h-11"/g) ?? []).length
  if (count >= 2) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker 2 input min-h-11 適用 OK (${count} 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker min-h-11 件数 ${count} (期待 ≥2)`,
    })
  }

  // iter904 invariant
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if ((sp.match(/className="min-h-11 text-xs"/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter904 invariant: sprints-panel period edit 2 date inputs 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter904 invariant: 破壊` })
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

  console.log(`\n=== Findings (schedule-item-picker-input-mobile-target-iter905) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

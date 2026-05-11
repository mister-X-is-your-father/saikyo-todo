/**
 * Phase 6.15 loop iter 906 (mode-M Mobile audit / iter889-905 follow-up) —
 * items-board の 2 filter select (status / sprint) を min-h-11 化。
 *
 * 検証: source-side regex assert + iter905 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  const count = (ib.match(/className="min-h-11 rounded border px-2 py-1 text-sm"/g) ?? []).length
  if (count >= 2) {
    findings.push({
      level: 'info',
      message: `items-board filter select min-h-11 適用 OK (${count} 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board filter select min-h-11 件数 ${count} (期待 ≥2)`,
    })
  }

  // iter905 invariant
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if ((sip.match(/className="min-h-11"/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter905 invariant: schedule-item-picker min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter905 invariant: 破壊` })
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

  console.log(`\n=== Findings (items-board-filter-select-mobile-target-iter906) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

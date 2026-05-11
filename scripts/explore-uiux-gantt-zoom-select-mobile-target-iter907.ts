/**
 * Phase 6.15 loop iter 907 (mode-M Mobile audit / iter889-906 follow-up) —
 * gantt-view の zoom select を min-h-11 化。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /data-testid="gantt-zoom-select"[\s\S]{0,400}|className="min-h-11 rounded border bg-transparent/.test(
      gv,
    ) &&
    /className="min-h-11 rounded border bg-transparent/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt-view zoom select min-h-11 適用 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt-view zoom select 未適用` })
  }

  // iter906 invariant
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if ((ib.match(/className="min-h-11 rounded border px-2 py-1 text-sm"/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter906 invariant: items-board filter select 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter906 invariant: 破壊` })
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

  console.log(`\n=== Findings (gantt-zoom-select-mobile-target-iter907) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

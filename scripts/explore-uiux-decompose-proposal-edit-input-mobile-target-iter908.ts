/**
 * Phase 6.15 loop iter 908 (mode-M Mobile audit / iter889-907 follow-up) —
 * decompose-proposals-panel の proposal 編集 form 2 IMEInput (title / dod MUST 必須) を min-h-11 化。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const count = (dpp.match(/className="min-h-11"/g) ?? []).length
  if (count >= 2) {
    findings.push({
      level: 'info',
      message: `decompose-proposals proposal edit form min-h-11 適用 OK (${count} 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals min-h-11 件数 ${count} (期待 ≥2)`,
    })
  }

  // iter907 invariant
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/className="min-h-11 rounded border bg-transparent/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter907 invariant: gantt zoom select 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter907 invariant: 破壊` })
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

  console.log(`\n=== Findings (decompose-proposal-edit-input-mobile-target-iter908) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Phase 6.15 loop iter 896 (mode-M Mobile audit / iter889-895 follow-up) —
 * templates-panel の Template 作成 form 3 input (name / kind select / cron) を min-h-11 化。
 *
 * fix (1 ファイル 3 行差分): tmpl-name (IMEInput) + tmpl-kind (select) + tmpl-cron (IMEInput)。
 *
 * 検証: source-side regex assert + iter895 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  const nameOk = /id="tmpl-name"[\s\S]{0,800}className="min-h-11"/.test(tp)
  const kindOk = /id="tmpl-kind"[\s\S]{0,300}className="min-h-11 w-full/.test(tp)
  const cronOk = /id="tmpl-cron"[\s\S]{0,300}className="min-h-11 font-mono"/.test(tp)
  if (nameOk && kindOk && cronOk) {
    findings.push({
      level: 'info',
      message: `templates-panel 作成 form 3 input min-h-11 適用 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel min-h-11 name=${nameOk}, kind=${kindOk}, cron=${cronOk}`,
    })
  }

  // iter895 invariant
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/className="min-h-11 flex-1"/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter895 invariant: goals-panel KR title flex-1 min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter895 invariant: 破壊` })
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

  console.log(`\n=== Findings (templates-create-form-input-mobile-target-iter896) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

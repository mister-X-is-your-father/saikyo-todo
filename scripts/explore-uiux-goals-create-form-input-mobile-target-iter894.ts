/**
 * Phase 6.15 loop iter 894 (mode-M Mobile audit / iter889-893 follow-up) —
 * goals-panel の Goal 作成 form 3 input (title / start / end) を min-h-11 化。
 *
 * 課題: OKR Goal 作成は四半期 cycle の起点、mobile からも触られる。h-8 → 44px (WCAG 2.5.8 AAA)。
 *
 * fix (1 ファイル 3 行差分): title (IMEInput) + start + end (Input date)。
 *
 * 検証: source-side regex assert + iter893 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const titleOk = /id="goal-title"[\s\S]{0,800}className="min-h-11"/.test(gp)
  const startOk = /id="goal-start"[\s\S]{0,400}className="min-h-11"/.test(gp)
  const endOk = /id="goal-end"[\s\S]{0,400}className="min-h-11"/.test(gp)
  if (titleOk && startOk && endOk) {
    findings.push({
      level: 'info',
      message: `goals-panel Goal 作成 3 input min-h-11 適用 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel min-h-11 title=${titleOk}, start=${startOk}, end=${endOk}`,
    })
  }

  // iter893 invariant
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/id="sprint-name"[\s\S]{0,800}className="min-h-11"/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter893 invariant: sprints-panel name input min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter893 invariant: 破壊` })
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

  console.log(`\n=== Findings (goals-create-form-input-mobile-target-iter894) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

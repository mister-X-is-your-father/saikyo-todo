/**
 * Phase 6.15 loop iter 891 (mode-M Mobile audit / iter889-890 follow-up) —
 * budget-panel の 2 Input (budget-limit / budget-warn) を min-h-11 に拡張。
 *
 * 課題: AI 月次コスト上限編集 form は数値 input 2 件で mobile decimal keypad 必須だが
 *   h-8 では touch target 不足。
 *
 * fix (1 ファイル 2 行差分):
 *   - budget-limit Input
 *   - budget-warn Input
 *
 * 検証: source-side regex assert + iter890/889/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  // budget-limit と budget-warn 両方 min-h-11 になっていること
  const limitOk =
    /id="budget-limit"[\s\S]{0,400}className="min-h-11"|className="min-h-11"[\s\S]{0,300}id="budget-limit"/.test(
      bp,
    )
  const warnOk =
    /id="budget-warn"[\s\S]{0,400}className="min-h-11"|className="min-h-11"[\s\S]{0,300}id="budget-warn"/.test(
      bp,
    )
  if (limitOk && warnOk) {
    findings.push({
      level: 'info',
      message: `budget-panel budget-limit + budget-warn min-h-11 適用 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel Input min-h-11 limit=${limitOk}, warn=${warnOk}`,
    })
  }

  // iter890 invariant
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if ((cwf.match(/className="min-h-11"/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter890 invariant: create-workspace-form min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter890 invariant: 破壊` })
  }

  // iter889 invariant
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if ((lf.match(/className="min-h-11"/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter889 invariant: login-form min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter889 invariant: 破壊` })
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

  console.log(`\n=== Findings (budget-panel-input-mobile-target-iter891) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Phase 6.15 loop iter 895 (mode-M Mobile audit / iter889-894 follow-up) —
 * goals-panel の KR (Key Result) 追加 form 4 input (title / mode select / target / unit) を
 * min-h-11 化。
 *
 * 課題: KR は Goal 配下で複数追加するため繰返し入力、mobile target 不足だと工数増。
 *
 * fix (1 ファイル 4 行差分): krTitle (IMEInput) + mode (select) + target + unit (Input)。
 *
 * 検証: source-side regex assert + iter894 invariant cross-check。
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
  // KR 4 input が min-h-11
  const krTitleOk =
    /data-testid=\{`kr-title-input-\$\{goalId\}`\}[\s\S]{0,200}className="min-h-11/.test(gp) ||
    /className="min-h-11 flex-1"[\s\S]{0,500}data-testid=\{`kr-title-input-\$\{goalId\}`\}/.test(gp)
  const modeSelectOk = /className="min-h-11 rounded border px-2 py-1 text-xs"/.test(gp)
  const targetOk =
    /placeholder="例: 100"[\s\S]{0,100}className="min-h-11 w-32/.test(gp) ||
    /className="min-h-11 w-32 text-sm"[\s\S]{0,200}placeholder="例: 100"/.test(gp)
  const unitOk =
    /placeholder="例: 件 \/ %"[\s\S]{0,100}className="min-h-11 w-24/.test(gp) ||
    /className="min-h-11 w-24 text-sm"[\s\S]{0,200}placeholder="例: 件 \/ %"/.test(gp)
  if (krTitleOk && modeSelectOk && targetOk && unitOk) {
    findings.push({
      level: 'info',
      message: `goals-panel KR form 4 input min-h-11 適用 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel KR form min-h-11 krTitle=${krTitleOk}, mode=${modeSelectOk}, target=${targetOk}, unit=${unitOk}`,
    })
  }

  // iter894 invariant
  if (/id="goal-title"[\s\S]{0,800}className="min-h-11"/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter894 invariant: goals-panel Goal 作成 title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter894 invariant: 破壊` })
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

  console.log(`\n=== Findings (goals-kr-form-input-mobile-target-iter895) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

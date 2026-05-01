/**
 * Phase 6.15 loop iter 567 (mode-D Desktop a11y) —
 * BudgetPanel budget-limit Input に aria-invalid を補完。
 *
 * 課題: budget-panel.tsx 行 219-230 の budget-limit Input は HTML5 min=0 制約を
 *   持つが aria-invalid 不在。負数や NaN を入力しても SR には valid として伝わる。
 *   空欄は valid (= 無制限) という特殊 case あり。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-invalid={(draftLimit !== '' && (Number.isNaN(Number(draftLimit)) || Number(draftLimit) < 0)) || undefined}
 *
 * 空欄チェックを優先 (= 無制限なので valid)、入力ありの場合は parseable + 0 以上を確認。
 * iter566 (budget-warn) と pair で budget-panel 内 2 number Input を validation 統一。
 *
 * +5 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、Label htmlFor / id /
 * type=number / step / min / inputMode / data-testid / placeholder invariant 維持。
 *
 * 検証: source-side regex assert + iter515-566 invariant cross-check。
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

  // 1. budget-limit aria-invalid
  if (
    /id="budget-limit"[\s\S]*?aria-invalid=\{[\s\S]*?draftLimit !== ''[\s\S]*?Number\.isNaN\(Number\(draftLimit\)\)[\s\S]*?Number\(draftLimit\) < 0/.test(
      bp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `budget-panel.tsx: budget-limit aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: budget-limit aria-invalid 不在`,
    })
  }

  // 2. iter566 invariant: budget-warn aria-invalid 維持
  if (
    /id="budget-warn"[\s\S]*?aria-invalid=\{[\s\S]*?draftWarn !== ''[\s\S]*?Number\(draftWarn\) < 0[\s\S]*?Number\(draftWarn\) > 1/.test(
      bp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter566 invariant: budget-warn aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter566 invariant: 破壊`,
    })
  }

  // 3. iter553/558 invariant: budget form aria-label + cancel aria-label 維持
  if (
    /aria-label="AI 月次コスト上限編集フォーム"/.test(bp) &&
    /aria-label="AI 月次コスト上限の編集をキャンセル"/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `iter553/558 invariant: budget form + cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter553/558 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (budget-limit-aria-invalid-iter567) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

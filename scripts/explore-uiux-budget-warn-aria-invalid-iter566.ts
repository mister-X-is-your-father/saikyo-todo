/**
 * Phase 6.15 loop iter 566 (mode-D Desktop a11y) —
 * BudgetPanel budget-warn Input に aria-invalid を補完。
 *
 * 課題: budget-panel.tsx 行 236-246 の budget-warn Input は HTML5 min=0/max=1 制約を
 *   持つが aria-invalid 不在。0..1 の range 外を入力しても SR には valid として
 *   伝わる。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-invalid={draftWarn !== '' && (Number(draftWarn) < 0 || Number(draftWarn) > 1) || undefined}
 *
 * +3 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、Label htmlFor / id /
 * type=number / step / min=0 / max=1 / inputMode / data-testid invariant 維持。
 *
 * 検証: source-side regex assert + iter515-565 invariant cross-check。
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

  // 1. budget-warn aria-invalid
  if (
    /id="budget-warn"[\s\S]*?aria-invalid=\{[\s\S]*?draftWarn !== ''[\s\S]*?Number\(draftWarn\) < 0[\s\S]*?Number\(draftWarn\) > 1/.test(
      bp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `budget-panel.tsx: budget-warn aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: budget-warn aria-invalid 不在`,
    })
  }

  // 2. 既存 type=number / step / min / max / inputMode / data-testid 維持
  if (
    /id="budget-warn"/.test(bp) &&
    /type="number"/.test(bp) &&
    /step="0\.05"/.test(bp) &&
    /min=\{0\}/.test(bp) &&
    /max=\{1\}/.test(bp) &&
    /inputMode="decimal"/.test(bp) &&
    /data-testid="budget-warn-input"/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `budget-panel.tsx: budget-warn 既存 type/step/min/max/inputMode/data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: budget-warn 既存属性破壊`,
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

  console.log(`\n=== Findings (budget-warn-aria-invalid-iter566) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

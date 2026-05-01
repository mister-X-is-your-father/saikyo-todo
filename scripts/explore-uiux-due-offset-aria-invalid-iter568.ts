/**
 * Phase 6.15 loop iter 568 (mode-D Desktop a11y) —
 * TemplateItemsEditor 期日 offset Input に aria-invalid を補完。
 *
 * 課題: template-items-editor.tsx の期日 offset Input は HTML5 min=0/max=365 制約は
 *   持つが aria-invalid 不在。範囲外 (負数 / 365 超 / NaN) を入力しても SR には
 *   valid として伝わる。空欄は valid (= 期日設定なし) という特殊 case。
 *
 * fix (1 ファイル ~7 行差分):
 *   - aria-invalid={(dueOffset !== '' && (Number.isNaN(...) || < 0 || > 365)) || undefined}
 *
 * iter566/567 (budget) と同 pattern で number input range 検知。
 * +7 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、type=number / min /
 * max / step / inputMode / aria-label invariant 維持。
 *
 * 検証: source-side regex assert + iter515-567 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )

  // 1. 期日 offset aria-invalid
  if (
    /aria-label="期日 offset[\s\S]*?aria-invalid=\{[\s\S]*?dueOffset !== ''[\s\S]*?Number\.isNaN\(Number\(dueOffset\)\)[\s\S]*?Number\(dueOffset\) < 0[\s\S]*?Number\(dueOffset\) > 365/.test(
      tie,
    )
  ) {
    findings.push({
      level: 'info',
      message: `template-items-editor.tsx: 期日 offset aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor.tsx: 期日 offset aria-invalid 不在`,
    })
  }

  // 2. 既存 type=number / min / max / step / inputMode 維持
  if (
    /type="number"[\s\S]{0,500}min=\{0\}[\s\S]{0,200}max=\{365\}[\s\S]{0,100}step=\{1\}[\s\S]{0,100}inputMode="numeric"/.test(
      tie,
    )
  ) {
    findings.push({
      level: 'info',
      message: `template-items-editor.tsx: 期日 offset 既存属性 (min/max/step/inputMode) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor.tsx: 期日 offset 既存属性破壊`,
    })
  }

  // 3. iter567 invariant: budget-limit aria-invalid 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/id="budget-limit"[\s\S]*?aria-invalid=\{[\s\S]*?draftLimit !== ''/.test(bp)) {
    findings.push({
      level: 'info',
      message: `iter567 invariant: budget-limit aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter567 invariant: 破壊`,
    })
  }

  // 4. iter566 invariant: budget-warn aria-invalid 維持
  if (/id="budget-warn"[\s\S]*?aria-invalid=\{[\s\S]*?draftWarn !== ''/.test(bp)) {
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

  console.log(`\n=== Findings (due-offset-aria-invalid-iter568) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Phase 6.15 loop iter 569 (mode-D Desktop a11y) —
 * SprintsPanel sprint-defaults-length Input に aria-invalid を補完。
 *
 * 課題: sprints-panel.tsx 行 899-911 の sprint-defaults-length Input は HTML5
 *   min=1/max=90 制約を持つが aria-invalid 不在。範囲外 (0 / 91+) の値が state に
 *   入っても SR には valid として伝わる。length は number state なので空欄チェック不要。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-invalid={length < 1 || length > 90 || undefined}
 *
 * iter566/567/568 number-input range pattern を sprint-defaults-length に展開、
 * 4 number Input range validation 統一。
 *
 * +1 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、Label htmlFor / id /
 * type=number / min / max / step / inputMode / aria-label / data-testid invariant 維持。
 *
 * 検証: source-side regex assert + iter515-568 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-defaults-length aria-invalid
  if (
    /id="sprint-defaults-length"[\s\S]*?aria-invalid=\{length < 1 \|\| length > 90 \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-defaults-length aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: sprint-defaults-length aria-invalid 不在`,
    })
  }

  // 2. 既存属性維持
  if (
    /id="sprint-defaults-length"[\s\S]*?type="number"[\s\S]*?min=\{1\}[\s\S]*?max=\{90\}[\s\S]*?inputMode="numeric"[\s\S]*?data-testid="sprint-defaults-length"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-defaults-length 既存属性維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: 既存属性破壊`,
    })
  }

  // 3. iter568 invariant: 期日 offset aria-invalid 維持
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (/aria-label="期日 offset[\s\S]*?aria-invalid=\{[\s\S]*?dueOffset !== ''/.test(tie)) {
    findings.push({
      level: 'info',
      message: `iter568 invariant: 期日 offset aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter568 invariant: 破壊`,
    })
  }

  // 4. iter567 invariant: budget-limit aria-invalid 維持
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

  console.log(`\n=== Findings (sprint-length-aria-invalid-iter569) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

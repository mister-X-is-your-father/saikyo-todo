/**
 * Phase 6.15 loop iter 570 (mode-D Desktop a11y) —
 * SprintsPanel sprint-name Input に aria-invalid (whitespace-only 検知) を補完。
 *
 * 課題: sprints-panel.tsx 行 206-217 の sprint-name は required + minLength=1 制約を
 *   持つが aria-invalid 不在。ユーザがスペースだけ入力した場合、name.trim() が空に
 *   なって submit 不可だが、SR には invalid 状態として伝わらない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-invalid={(name.length > 0 && name.trim() === '') || undefined}
 *
 * iter566/567/568/569 number-input range pattern を text-input whitespace-only 検知に展開。
 * length > 0 (空欄じゃない) かつ trim() === '' (whitespace のみ) のとき invalid。
 *
 * +1 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、Label htmlFor / id /
 * required / aria-required / minLength / maxLength / autoComplete invariant 維持。
 *
 * 検証: source-side regex assert + iter515-569 invariant cross-check。
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

  // 1. sprint-name aria-invalid (whitespace-only)
  if (
    /id="sprint-name"[\s\S]*?aria-invalid=\{\(name\.length > 0 && name\.trim\(\) === ''\) \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-name aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: sprint-name aria-invalid 不在`,
    })
  }

  // 2. 既存 required / aria-required 維持
  if (/id="sprint-name"[\s\S]*?required[\s\S]*?aria-required="true"/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-name required + aria-required 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: 既存 required 破壊`,
    })
  }

  // 3. iter569 invariant: sprint-defaults-length aria-invalid 維持
  if (
    /id="sprint-defaults-length"[\s\S]*?aria-invalid=\{length < 1 \|\| length > 90 \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter569 invariant: sprint-defaults-length aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter569 invariant: 破壊`,
    })
  }

  // 4. iter539 invariant: sprint-start aria-invalid 維持
  if (
    /id="sprint-start"[\s\S]*?aria-invalid=\{isInvalidDateRange\(startDate, endDate\) \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter539 invariant: sprint-start aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter539 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (sprint-name-aria-invalid-iter570) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

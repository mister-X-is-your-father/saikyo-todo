/**
 * Phase 6.15 loop iter 349 — budget-panel (2 number input: limit + warn) +
 * sprints-panel (sprint-defaults-length) + time-entry (teMinutes) に
 * inputMode を追加 (mobile keyboard 最適化)、iter347-348 続編。
 *
 * 課題: type="number" は desktop 専用、mobile keyboard では browser ごと挙動
 *   差異があり inputMode を明示しないと alphanumeric が出る場合あり。USD ($)
 *   や warn threshold (0..1) は decimal 入力、Sprint 期間 / 稼働 minutes は
 *   integer なので numeric。
 *
 * fix: budget-panel limit/warn に inputMode="decimal"、sprint-defaults-length に
 *   step={1} + inputMode="numeric"、teMinutes に inputMode="numeric"。aria-label
 *   に範囲 hint も append (sprint-defaults-length)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 3 ファイル、約 5 行追加。
 *
 * 検証: source-side regex assert で codify。
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
  const decimalCount = (bp.match(/inputMode="decimal"/g) ?? []).length
  if (decimalCount < 2) {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: inputMode="decimal" 必要 ≥2 件 (現状 ${decimalCount})`,
    })
  }

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    !/id="sprint-defaults-length"[\s\S]*?inputMode="numeric"/.test(sp) ||
    !/id="sprint-defaults-length"[\s\S]*?step=\{1\}/.test(sp)
  ) {
    findings.push({
      level: 'warning',
      message: 'sprints-panel.tsx: sprint-defaults-length inputMode/step 不在',
    })
  }

  const te = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (!/id="teMinutes"[\s\S]*?inputMode="numeric"/.test(te)) {
    findings.push({
      level: 'warning',
      message: 'create-time-entry-form.tsx: teMinutes inputMode 不在',
    })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: '4 number input inputMode/step OK' })
  }

  console.log(`\n=== Findings (number-inputmode-iter349) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

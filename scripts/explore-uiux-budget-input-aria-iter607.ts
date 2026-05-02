/**
 * Phase 6.15 loop iter 607 (mode-D Desktop a11y) —
 * budget-panel limit / warn Input aria-label を 3-state 動的化
 * (空欄 / 不正値 / 有効値、SR ユーザに current 値と効果を expose)。
 *
 * 課題: budget-panel.tsx 行 219-235 / 241-256 の budget-limit / budget-warn Input は
 *   <Label htmlFor> による accessible name のみで current 値が aria 側で expose されない。
 *   特に warn 値 (0..1) は visible 表記が "0.8" 等 raw decimal で SR には percent 効果が
 *   伝わらない。
 *
 * fix (1 ファイル ~14 行差分、IIFE 風 ternary 3-state):
 *   - budget-limit 3-state:
 *     - 空欄: '月次上限 (USD) — 空欄で無制限'
 *     - 不正: `月次上限 (USD、0 以上の数値必須、現在値「${draftLimit}」は不正)`
 *     - 有効: `月次上限 (USD、現在: $${draftLimit.toFixed(2)})`
 *   - budget-warn 3-state:
 *     - 空欄/NaN: '警告閾値 (0..1、消費率がこの値を超えると UI バーを警告色に切替)'
 *     - 不正: `警告閾値 (有効範囲は 0-1、現在値「${draftWarn}」は範囲外)`
 *     - 有効: `警告閾値 (現在: ${pct}% — 消費率がこの値を超えると UI バーを警告色に切替)`
 *       (decimal 0.8 を percent 80% で SR に伝える)
 *
 * iter587-606 (動的 aria-label expose) pattern を budget Input 群に水平展開。
 *
 * 検証: source-side regex assert + iter515-606 invariant cross-check。
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

  // 1. budget-limit 空欄 hint
  if (/draftLimit === ''\s*\n?\s*\?\s*'月次上限 \(USD\) — 空欄で無制限'/.test(bp)) {
    findings.push({ level: 'info', message: `budget-limit 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `budget-limit 空欄 hint なし` })
  }

  // 2. budget-limit 有効値 hint
  if (/:\s*`月次上限 \(USD、現在: \$\$\{Number\(draftLimit\)\.toFixed\(2\)\}\)`/.test(bp)) {
    findings.push({ level: 'info', message: `budget-limit 有効値 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `budget-limit 有効値 hint なし` })
  }

  // 3. budget-warn 空欄/NaN hint
  if (
    /draftWarn === '' \|\| Number\.isNaN\(Number\(draftWarn\)\)\s*\n?\s*\?\s*'警告閾値 \(0\.\.1、消費率がこの値を超えると UI バーを警告色に切替\)'/.test(
      bp,
    )
  ) {
    findings.push({ level: 'info', message: `budget-warn 空欄/NaN hint OK` })
  } else {
    findings.push({ level: 'warning', message: `budget-warn 空欄/NaN hint なし` })
  }

  // 4. budget-warn 有効値 percent expose
  if (
    /:\s*`警告閾値 \(現在: \$\{Math\.round\(Number\(draftWarn\) \* 100\)\}% — 消費率がこの値を超えると UI バーを警告色に切替\)`/.test(
      bp,
    )
  ) {
    findings.push({ level: 'info', message: `budget-warn percent expose OK` })
  } else {
    findings.push({ level: 'warning', message: `budget-warn percent expose なし` })
  }

  // 5. iter606 invariant: sprint-defaults-length 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/length < 1 \|\| length > 90\s*\n?\s*\?\s*`Sprint 期間 \(日数\) の有効範囲は 1-90/.test(sp)) {
    findings.push({ level: 'info', message: `iter606 invariant: sprint-defaults-length 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter606 invariant: 破壊` })
  }

  // 6. iter603 invariant: editSprint aria-label 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const current = \(sprintsList\.data \?\? \[\]\)\.find\(/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter603 invariant: editSprint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter603 invariant: 破壊` })
  }

  console.log(`\n=== Findings (budget-input-aria-iter607) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

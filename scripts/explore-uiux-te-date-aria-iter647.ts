/**
 * Phase 6.15 loop iter 647 (mode-D Desktop a11y) —
 * create-time-entry-form teDate Input aria-label を 4-state IIFE 動的化
 * (47 input 統一達成、今日 vs 過去 vs 未来 expose)。
 *
 * 課題: create-time-entry-form.tsx 行 70-77 の teDate Input は <Label htmlFor>
 *   のみで current 値 / 今日との関係 (今日/過去/未来) が aria 側で expose されない。
 *
 * fix (1 ファイル ~9 行差分、IIFE 4-state):
 *   - 空欄: 「今日まで指定可、未来日付は不正」 hint
 *   - 未来 (today より後): 「不正」 alert
 *   - 今日: 「今日」 explicit
 *   - 過去: 「過去日付」 (普通の case)
 *
 * iter646 edit-dates pattern を teDate に拡張、saikyo-todo 内 動的 aria-label
 * が 47 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-646 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ctef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // 1. IIFE 動的化
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const today = new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teDate IIFE 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `teDate IIFE 動的化なし` })
  }

  // 2. 空欄 hint
  if (
    /if \(workDate === ''\)\s*\n?\s*return '日付 \(必須、今日まで指定可、未来日付は不正\)'/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teDate 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `teDate 空欄 hint なし` })
  }

  // 3. 未来 hint
  if (
    /if \(workDate > today\)\s*\n?\s*return `日付 \(現在: \$\{workDate\}、今日 \$\{today\} より後の未来日付で不正\)`/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teDate 未来 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `teDate 未来 hint なし` })
  }

  // 4. 今日 hint
  if (/if \(workDate === today\) return `日付 \(現在: \$\{workDate\}、今日\)`/.test(ctef)) {
    findings.push({ level: 'info', message: `teDate 今日 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `teDate 今日 hint なし` })
  }

  // 5. iter646 invariant: editStart 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/startDate === ''\s*\n?\s*\?\s*'開始日 \(任意、期限以前\)'/.test(ied)) {
    findings.push({ level: 'info', message: `iter646 invariant: editStart 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter646 invariant: 破壊` })
  }

  // 6. iter635 invariant: teCategory 維持
  if (
    /aria-label=\{`カテゴリ \(現在: \$\{TIME_ENTRY_CATEGORIES\.find\(\(c\) => c\.key === category\)\?\.label \?\? category\}\)`\}/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `iter635 invariant: teCategory 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter635 invariant: 破壊` })
  }

  console.log(`\n=== Findings (te-date-aria-iter647) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

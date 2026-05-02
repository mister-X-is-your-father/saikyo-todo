/**
 * Phase 6.15 loop iter 636 (mode-D Desktop a11y) —
 * schedule-item-picker 検索 Input + 割込みメモ Input aria-label を 2-state 動的化
 * (31 input 統一達成)。
 *
 * 課題: schedule-item-picker.tsx の 検索 Input と 割込みメモ Input は static
 *   aria-label のみで current 値が aria 側で expose されない。
 *
 * fix (1 ファイル ~14 行差分、2 input):
 *   - 検索 Input: 空欄 / 通常 (現在のクエリ + 文字数 expose)
 *   - 割込みメモ Input: 空欄 (fallback hint) / 通常 (文字数 expose)
 *
 * iter635 teCategory pattern を schedule-item-picker に展開、saikyo-todo 内
 * 動的 aria-label が 31 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-635 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )

  // 1. 検索 Input 空欄 hint
  if (/q\.length === 0\s*\n?\s*\?\s*'task を検索 \(タイトルで部分一致\)'/.test(sip)) {
    findings.push({ level: 'info', message: `search 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `search 空欄 hint なし` })
  }

  // 2. 検索 Input 通常 hint
  if (/:\s*`task を検索 \(現在のクエリ "\$\{q\}" — \$\{q\.length\} 文字\)`/.test(sip)) {
    findings.push({ level: 'info', message: `search 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `search 通常 hint なし` })
  }

  // 3. 割込みメモ 空欄 hint
  if (
    /interruptNote\.length === 0\s*\n?\s*\?\s*'割込み \/ 休憩のメモ \(任意、空欄で「割込み」 fallback\)'/.test(
      sip,
    )
  ) {
    findings.push({ level: 'info', message: `interrupt-note 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `interrupt-note 空欄 hint なし` })
  }

  // 4. 割込みメモ 通常 hint
  if (/:\s*`割込み \/ 休憩のメモ \(現在 \$\{interruptNote\.length\} 文字\)`/.test(sip)) {
    findings.push({ level: 'info', message: `interrupt-note 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `interrupt-note 通常 hint なし` })
  }

  // 5. iter635 invariant: teCategory 維持
  const ctef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`カテゴリ \(現在: \$\{TIME_ENTRY_CATEGORIES\.find\(\(c\) => c\.key === category\)\?\.label \?\? category\}\)`\}/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `iter635 invariant: teCategory 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter635 invariant: 破壊` })
  }

  // 6. iter614 invariant: teDescription 維持
  if (
    /description\.length === 0\s*\n?\s*\?\s*'作業内容 \(必須、最大 500 文字、何をやったかを 1 行で\)'/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `iter614 invariant: teDescription 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter614 invariant: 破壊` })
  }

  console.log(`\n=== Findings (schedule-picker-aria-iter636) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

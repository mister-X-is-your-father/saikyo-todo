/**
 * Phase 6.15 loop iter 419 (mode-D Desktop a11y) — Calendar/Schedule view の
 * `ScheduleItemPicker` modal dialog の a11y 4 件をまとめて修正、codify。
 *
 * 課題: src/components/schedule/schedule-item-picker.tsx は
 *   `<div role="dialog" aria-modal="true">` だが以下が欠落:
 *   1. `aria-label` / `aria-labelledby` 不在 — SR は「dialog」と読み上げるが
 *      用途 (task picker / 割込み記録) が伝わらない
 *   2. Escape キー handler 不在 — Escape で閉じられない、UX 慣例違反
 *      (SR ユーザは「キャンセル」 button を Tab で探す必要がある)
 *   3. 検索 input が placeholder のみで `aria-label` 不在 — SR は input の
 *      用途を読み上げず「edit text」のみ
 *   4. 割込み note の `<label>` が `htmlFor` で input に紐付いていない —
 *      label click で input focus が動かず、SR でも association が壊れる
 *
 * fix: 1 ファイル ~12 行差分。
 *   - dialog div に `aria-labelledby="schedule-picker-title"` 追加 + `<h2 sr-only>`
 *     で動的タイトル ("実績 / 割込みを記録する task を選択" or "想定する task を選択")
 *   - dialog div に `onKeyDown` で Escape → onCancel (e.stopPropagation で
 *     親 dialog (ItemEditDialog 等) との重複を防止)
 *   - 検索 input に `aria-label="task を検索"` 追加、Search icon を `aria-hidden`
 *   - 割込み note label に `htmlFor` + Input に対応 `id` 配線
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (Calendar view 表示) は
 *   workspace + item seed が必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/schedule/schedule-item-picker.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. dialog aria-labelledby + 対応 h2 sr-only
  if (
    /role="dialog"[\s\S]{0,200}?aria-labelledby="schedule-picker-title"/.test(src) &&
    /id="schedule-picker-title"[\s\S]{0,80}?className="sr-only"/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: dialog aria-labelledby + sr-only h2 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: dialog aria-labelledby または sr-only h2 不在`,
    })
  }

  // 2. Escape key handler
  if (
    /onKeyDown=\{\(e\) => \{[\s\S]{0,200}?e\.key === 'Escape'[\s\S]{0,100}?onCancel\(\)/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: Escape → onCancel handler OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Escape key handler 不在` })
  }

  // 3. 検索 input aria-label + Search icon aria-hidden
  if (/aria-label="task を検索"/.test(src) && /<Search[\s\S]{0,80}?aria-hidden="true"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: 検索 input aria-label + icon aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 検索 input aria-label または icon aria-hidden 不在`,
    })
  }

  // 4. 割込み note label htmlFor 配線
  if (
    /<label\s+htmlFor="schedule-picker-interrupt-note"/.test(src) &&
    /<Input\s+id="schedule-picker-interrupt-note"/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: 割込み note label htmlFor + id 配線 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 割込み note label htmlFor または id 不在`,
    })
  }

  console.log(`\n=== Findings (schedule-picker-dialog-iter419) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

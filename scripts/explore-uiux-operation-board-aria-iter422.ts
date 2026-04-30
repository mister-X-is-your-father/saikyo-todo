/**
 * Phase 6.15 loop iter 422 (mode-D Desktop a11y) — OperationBoardWidget
 * (iter522 で追加された「今日の作戦盤」 widget) の ItemRow が SR に
 * 視覚情報の半分しか届けていなかった問題を修正、codify。
 *
 * 課題: src/components/workspace/operation-board-widget.tsx の `ItemRow`:
 *   - aria-label = `${item.title} を編集ダイアログで開く` のみ
 *   - 視覚的には title + dueTime (HH:MM) + dueDate (YYYY-MM-DD) + 状態 (red
 *     tone = overdue / muted = done / highlight = 推奨) を表示
 *   - SR は title だけ聞き取り、時刻 / 期限 / 状態 prefix が伝わらない
 *   - 「期限超過」「完了済」「推奨」を **色のみで伝達** = WCAG 1.4.1 違反
 *
 * fix: 1 ファイル ~12 行差分。
 *   - statePrefix (`期限超過: ` / `完了済: ` / `推奨: ` / 空) を tone / muted /
 *     highlight から導出
 *   - aria-label = `${statePrefix}${title}${time}${date} を編集ダイアログで開く`
 *     形式に集約
 *   - visible 3 span (time / title / date) に `aria-hidden="true"` を付け
 *     SR 二重読み上げを防止 (button の aria-label が accessible name に)
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (Today widget 描画) は
 *   workspace + item seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/operation-board-widget.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. statePrefix で tone / muted / highlight 3 状態を文字化
  for (const label of ['期限超過: ', '完了済: ', '推奨: ']) {
    if (src.includes(`'${label}'`)) {
      findings.push({ level: 'info', message: `${path}: statePrefix "${label}" OK` })
    } else {
      findings.push({ level: 'warning', message: `${path}: statePrefix "${label}" 不在` })
    }
  }

  // 2. timePart + datePart を aria-label に組込み
  if (
    /const ariaLabel = `\$\{statePrefix\}\$\{item\.title\}\$\{timePart\}\$\{datePart\} を編集ダイアログで開く`/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: aria-label 集約 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: aria-label 集約 不在` })
  }

  // 3. visible 3 span (time / title / date) に aria-hidden="true"
  // (button が aria-label を持つので children を AT 上 hide)
  const ariaHiddenCount = (src.match(/aria-hidden="true"/g) ?? []).length
  // ItemRow visible 3 span (time / title / date) に aria-hidden 追加。
  // iter422 前: 8 (decorative icon 8 個)
  // iter422 後: 11 (+3 visible span)
  if (ariaHiddenCount >= 11) {
    findings.push({
      level: 'info',
      message: `${path}: aria-hidden カウント ${ariaHiddenCount} (>=11 = 3 visible span 追加 OK)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: aria-hidden カウント ${ariaHiddenCount} (<11)`,
    })
  }

  // 4. ariaLabel 変数を button に配線
  if (/aria-label=\{ariaLabel\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: button に ariaLabel 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: button に ariaLabel 配線 不在` })
  }

  console.log(`\n=== Findings (operation-board-aria-iter422) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

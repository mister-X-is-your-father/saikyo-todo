/**
 * Phase 6.15 loop iter 420 (mode-D Desktop a11y) — Calendar view の
 * `DiffSummaryBar` (想定 vs 実測 の差分 chip 一覧) で WCAG 1.4.1 (色のみで
 * 意味伝達) と decorative icon 二重読み上げ を修正、codify。
 *
 * 課題: src/components/schedule/diff-summary-bar.tsx
 *   1. severity (`ok` / `warn` / `danger` / `not_done` / `interrupt`) は **色 +
 *      icon (CheckCircle2 / TrendingUp / AlertTriangle / MinusCircle / Zap) のみ**
 *      で表現、文字情報なし → WCAG 1.4.1 違反 (色覚特性のあるユーザは状態
 *      不明)
 *   2. 5 icon に `aria-hidden` 不在 → SR は「checkmark / triangle / ...」と
 *      decorative icon を二重読み上げ
 *   3. `title` 属性 (mouse hover 専用) で「想定 X / 実測 Y」を冗長に表示。
 *      visible span が同じ値を見せているので **重複** + 移動 / SR で消える
 *   4. button に severity 文字情報を持つ `aria-label` 不在 → SR で
 *      "(不明) 1h → 1h30m +30m" のみ読み上げ、状態 (OK/危険) が伝わらない
 *
 * fix: 1 ファイル ~15 行差分。
 *   - 5 SEVERITY_ICON entry に `aria-hidden="true"` 付与
 *   - SEVERITY_LABEL_JA constant 追加 (5 severity の日本語ラベル)
 *   - button の `title` 削除、`aria-label` で severity + title + 想定 + 実測 +
 *     差分 を集約 (例: "危険 (1.5x 超過): A タスク 想定 1h 実測 1h30m 差分 +30m")
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし、色も既存維持。
 *
 * 検証: source-side regex assert で codify。runtime test (Calendar view 描画) は
 *   workspace + schedule seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/schedule/diff-summary-bar.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. 5 icon entry に aria-hidden
  const ICON_NAMES = ['CheckCircle2', 'TrendingUp', 'AlertTriangle', 'MinusCircle', 'Zap']
  for (const name of ICON_NAMES) {
    const re = new RegExp(`<${name}[^>]*aria-hidden="true"`)
    if (re.test(src)) {
      findings.push({ level: 'info', message: `${path}: ${name} aria-hidden OK` })
    } else {
      findings.push({ level: 'warning', message: `${path}: ${name} aria-hidden 不在` })
    }
  }

  // 2. SEVERITY_LABEL_JA 5 entry
  const LABELS = ['想定通り', '注意 (1.1〜1.5x)', '危険 (1.5x 超過)', '未実施', '割込み']
  for (const label of LABELS) {
    if (src.includes(`'${label}'`)) {
      findings.push({ level: 'info', message: `${path}: SEVERITY_LABEL_JA "${label}" OK` })
    } else {
      findings.push({ level: 'warning', message: `${path}: SEVERITY_LABEL_JA "${label}" 不在` })
    }
  }

  // 3. button aria-label に sevLabel + title + 想定 + 実測 を集約
  if (
    /aria-label=\{`\$\{sevLabel\}: \$\{title\} 想定 \$\{fmtMin\(r\.plannedMinutes\)\} 実測 \$\{fmtMin\(r\.actualMinutes\)\}\$\{deltaText\}`\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: button aria-label 集約 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: button aria-label 集約 不在` })
  }

  // 4. title 属性削除 (重複読み上げ防止)
  if (!/title=\{`想定 /.test(src)) {
    findings.push({ level: 'info', message: `${path}: 旧 title 属性 削除 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 title 属性 残存 (regression)` })
  }

  console.log(`\n=== Findings (diff-summary-aria-iter420) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

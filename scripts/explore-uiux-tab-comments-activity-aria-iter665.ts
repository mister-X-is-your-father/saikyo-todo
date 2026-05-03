/**
 * Phase 6.15 loop iter 665 (mode-D Desktop a11y) —
 * item-edit-dialog 「コメント」 / 「アクティビティ」 TabsTrigger に
 * aria-label を追加 (5 → 7 tab descriptive aria-label 統一達成)。
 *
 * 課題: item-edit-dialog.tsx 行 397-402 の `<TabsTrigger value="comments|activity">` は
 *   visible text "コメント" / "アクティビティ" のみで aria-label が無い。
 *   iter664 で「基本」を追加 (= 5 tab 統一) したが「コメント」「アクティビティ」が漏れていた。
 *   実際は 7 tab 構成で、iter664 完成のための残り 2 tab。
 *
 * fix (1 ファイル ~10 行差分):
 *   - コメント: aria-label="コメントタブ — 議論履歴 + @メンション + AI Plan 投下"
 *   - アクティビティ: aria-label="アクティビティタブ — 編集履歴 (audit_log) を時系列表示"
 *   - 7 tab すべてに descriptive aria-label が揃って SR ナビ統一達成
 *
 * 検証: source-side regex assert + iter515-664 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. コメントタブ aria-label
  if (/aria-label="コメントタブ — 議論履歴 \+ @メンション \+ AI Plan 投下"/.test(ied)) {
    findings.push({ level: 'info', message: `tab-comments aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `tab-comments aria-label なし` })
  }

  // 2. アクティビティタブ aria-label
  if (/aria-label="アクティビティタブ — 編集履歴 \(audit_log\) を時系列表示"/.test(ied)) {
    findings.push({ level: 'info', message: `tab-activity aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `tab-activity aria-label なし` })
  }

  // 3. iter664 invariant: 基本タブ aria-label 維持
  if (
    /aria-label="基本タブ — タイトル \/ 状態 \/ 期限 \/ MUST \/ 担当 \/ Tag \/ DoD を編集"/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter664 invariant: tab-base aria 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter664 invariant: 破壊` })
  }

  // 4. サマリ tab 既存 aria-label 維持 (= 全 5 → 7 tab に descriptive aria-label が揃った)
  if (/aria-label="サマリ タブ — この案件の進捗 \/ 依存 \/ 最終更新を一目で確認"/.test(ied)) {
    findings.push({ level: 'info', message: `tab-summary aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `tab-summary aria-label 破壊` })
  }

  // 5. iter663 invariant: backlog sort indicator aria-hidden 維持
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\s*\n\s*\{\{ asc: ' ▲', desc: ' ▼' \}/.test(bv)) {
    findings.push({ level: 'info', message: `iter663 invariant: backlog sort 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter663 invariant: 破壊` })
  }

  // 6. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tab-comments-activity-aria-iter665) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

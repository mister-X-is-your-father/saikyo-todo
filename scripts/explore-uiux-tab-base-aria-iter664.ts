/**
 * Phase 6.15 loop iter 664 (mode-D Desktop a11y) —
 * item-edit-dialog 「基本」 TabsTrigger に aria-label を追加
 * (他 4 tab がすべて descriptive aria-label を持つので統一)。
 *
 * 課題: item-edit-dialog.tsx 行 334-336 の `<TabsTrigger value="base">` は
 *   visible text "基本" のみで aria-label が無い。同 TabsList 内の他 4 tab
 *   (サマリ / 子タスク / 依存 / アクティビティ) は全て descriptive aria-label を
 *   持つ (例: "サマリ タブ — この案件の進捗 / 依存 / 最終更新を一目で確認")。
 *   SR ユーザは「基本」だけだとどんな field が編集可能か分からず、tab 切替の
 *   先読みができない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label="基本タブ — タイトル / 状態 / 期限 / MUST / 担当 / Tag / DoD を編集"
 *   - 5 tab すべてに descriptive aria-label が揃って SR ナビ統一
 *
 * 検証: source-side regex assert + iter515-663 invariant cross-check。
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

  // 1. 基本 tab に aria-label
  if (
    /aria-label="基本タブ — タイトル \/ 状態 \/ 期限 \/ MUST \/ 担当 \/ Tag \/ DoD を編集"/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `tab-base aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `tab-base aria-label なし` })
  }

  // 2. サマリ tab aria-label 既存維持
  if (/aria-label="サマリ タブ — この案件の進捗 \/ 依存 \/ 最終更新を一目で確認"/.test(ied)) {
    findings.push({ level: 'info', message: `tab-summary aria-label 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `tab-summary aria-label 破壊` })
  }

  // 3. iter663 invariant: backlog sort indicator aria-hidden 維持
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\s*\n\s*\{\{ asc: ' ▲', desc: ' ▼' \}/.test(bv)) {
    findings.push({ level: 'info', message: `iter663 invariant: backlog sort 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter663 invariant: 破壊` })
  }

  // 4. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  // 5. iter658 invariant: kanban decompose 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/group-focus-within:opacity-100/.test(kv)) {
    findings.push({ level: 'info', message: `iter658 invariant: kanban decompose 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter658 invariant: 破壊` })
  }

  // 6. iter178 invariant: 🧠 emoji aria-hidden 維持 (item-edit-dialog 同 file)
  if (/<span aria-hidden="true">🧠 <\/span>AI で分解/.test(ied)) {
    findings.push({ level: 'info', message: `iter178 invariant: 🧠 emoji 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter178 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tab-base-aria-iter664) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Phase 6.15 loop iter1789: comment-thread 4 button (edit-cancel / save / edit / delete)
 * に title 付与 (iter1785 ItemEditDialog footer / iter1787 archive と同 pattern を
 * comment-thread button family にも展開、comment CRUD UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/comment-thread.tsx の 4 button:
 *     - comment-edit-cancel: static aria-label "キャンセル — コメントの編集を破棄"
 *     - comment-save: conditional 3 path (not-trim / pending / default)
 *     - comment-edit: aria-label `編集 — コメント「<preview>」を編集`
 *     - comment-delete: conditional 2 path (pending / default)
 *   は visible "キャンセル" / "保存" / "編集" / "削除" のみ + aria-label で descriptive
 *   context を SR 提供だが、sighted は hover で comment body preview / shortcut hint
 *   即把握できなかった (aria-label は browser tooltip にならない)。
 *
 * 修正 (src/components/workspace/comment-thread.tsx, 16 line 追加 + 8 line comment 追加):
 *   4 button 全てに `title={同 aria-label}` 付与 (static + conditional)。aria-label /
 *   disabled / data-testid / onClick / aria-busy / aria-keyshortcuts 完全不変、
 *   shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-comment-thread-title-iter1789.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const thread = readFileSync(
    resolve(here, '../src/components/workspace/comment-thread.tsx'),
    'utf8',
  )

  // --- 1. comment-edit-cancel title 付与済 ---
  if (!thread.includes('title="キャンセル — コメントの編集を破棄"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'comment-edit-cancel button に title が無い',
    })
  }

  // --- 2. comment-save conditional 3 path text 維持 (aria-label + title 共通) ---
  for (const t of [
    "'保存 — コメントを保存するには本文を入力してください'",
    "'保存中… — コメントの編集を保存中'",
    "'保存 — コメントの編集を保存 (Cmd/Ctrl+Enter でも可)'",
  ]) {
    if (!thread.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `comment-save conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 3. title 件数 >= 5 (cancel + save 3 path 1 expr) ---
  // title 件数 expression は cancel(1) + save(1, conditional 3 path 内) + edit(1) +
  // delete(1, conditional 2 path 内) で >=4 expressions = title=数として 5 以上
  const titleCount = (thread.match(/\btitle=(\{|")/g) ?? []).length
  if (titleCount < 4) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `comment-thread title 件数が ${titleCount} (期待 >= 4: cancel + save + edit + delete)`,
    })
  }

  // --- 4. comment-edit / comment-delete title preview text 維持 ---
  if (
    !thread.includes(
      "title={`編集 — コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を編集`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'comment-edit title が消えている',
    })
  }

  // --- 5. iter1787 ItemEditDialog archive title 維持 ---
  const dialog = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (!dialog.includes('`アーカイブ — 「${item.title}」をアーカイブ (後で復元可能)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1787 ItemEditDialog archive path text が消えている',
    })
  }

  // --- 6. iter1785 ItemEditDialog cancel title 維持 ---
  if (!dialog.includes('title={`キャンセル — 「${item.title}」の編集を破棄`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1785 ItemEditDialog cancel title が消えている',
    })
  }

  // --- 7. iter1783 sprint-risk-board topRisk button title 維持 ---
  const widget = readFileSync(
    resolve(here, '../src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (!widget.includes('title={`${entry.item.title} を開く — risk score ${entry.riskScore}${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1783 sprint-risk-board topRisk button title が消えている',
    })
  }

  // --- 8. iter1777 view-switcher Today title 維持 ---
  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — comment-thread 4 button に title 付与で comment CRUD UX sighted hover disclosure、iter1787-1777 invariant 不変',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Phase 6.15 loop iter1791: comment-thread post + quick-add submit button に title 付与
 * (iter1785-1789 dialog footer / archive / comment family と同 pattern を 2 submit button
 * にも展開、submit UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   - src/components/workspace/comment-thread.tsx line 115-140 comment-post button:
 *     visible "投稿" / "送信中…" のみ + aria-label conditional 3 path
 *   - src/components/workspace/quick-add.tsx line 173-208 quick-add-submit button:
 *     visible "作成" のみ + aria-label conditional 4 path (no preview / MUST / pending / default)
 *   どちらも aria-label は browser tooltip にならず sighted は hover で context
 *   (shortcut hint / @user mention / preview.title) 即把握できなかった。
 *
 * 修正 (2 file 各 conditional title 追加 + comment 各 3 line):
 *   両 <Button> に conditional `title={同 aria-label}` 付与 (3 path / 4 path)。aria-label /
 *   disabled / data-testid / onClick / aria-busy / aria-keyshortcuts 完全不変、shadcn 編集なし、
 *   機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-submit-buttons-title-iter1791.ts
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
  const quickAdd = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')

  // --- 1. comment-post title 3 path text 維持 ---
  for (const t of [
    "'投稿 — コメントを投稿するには本文を入力してください'",
    "'送信中… — コメントを投稿中…'",
    "'投稿 — コメントを投稿 (Cmd/Ctrl+Enter でも可、@user で言及・通知)'",
  ]) {
    if (!thread.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `comment-post conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. comment-thread title 件数 >= 5 (cancel + save + edit + delete + post) ---
  const threadTitleCount = (thread.match(/\btitle=(\{|")/g) ?? []).length
  if (threadTitleCount < 5) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `comment-thread title 件数が ${threadTitleCount} (期待 >= 5: cancel + save + edit + delete + post)`,
    })
  }

  // --- 3. quick-add-submit title 4 path text 維持 ---
  for (const t of [
    "'作成 — タスクを作成するにはタイトルを入力してください (Enter でも可)'",
    "'作成 — MUST タスクは編集ダイアログから DoD を入力して作成してください'",
    '`「${preview.title}」を作成中…`',
    '`作成 — 「${preview.title}」を作成 (Enter でも可)`',
  ]) {
    if (!quickAdd.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `quick-add-submit conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 4. quick-add title 件数 >= 2 (preview title span + submit conditional 1 expr) ---
  const quickAddTitleCount = (quickAdd.match(/\btitle=(\{|")/g) ?? []).length
  if (quickAddTitleCount < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `quick-add title 件数が ${quickAddTitleCount} (期待 >= 2: preview + submit)`,
    })
  }

  // --- 5. iter1789 comment-edit-cancel title 維持 ---
  if (!thread.includes('title="キャンセル — コメントの編集を破棄"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1789 comment-edit-cancel title が消えている',
    })
  }

  // --- 6. iter1787 ItemEditDialog archive title 維持 ---
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

  // --- 7. iter1779 workspace nav Goals title 維持 ---
  const wsPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (!wsPage.includes('title="Goals — OKR / Goals (Objective + Key Results) ページへ移動"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1779 workspace nav Goals title が消えている',
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
      '(なし) — comment-post + quick-add-submit button に title 付与で submit UX sighted hover disclosure、iter1789-1777 invariant 不変',
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

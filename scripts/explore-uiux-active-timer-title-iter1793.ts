/**
 * Phase 6.15 loop iter1793: active-timer-panel pause / resume / stop button に title 付与
 * (iter1791 submit / iter1763 icon-only family と同 pattern を timer control 3 button にも
 * 展開、タイマー操作 UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/active-timer-panel.tsx の 3 control button:
 *     - pause/resume: icon-only Pause/Play、aria-label "一時停止 — タイマーを一時停止" /
 *       "再開 — タイマーを再開" のみ、no title
 *     - stop: visible "停止" + aria-label conditional 2 path、no title
 *   は sighted は hover で何の操作 / 稼働記録保存 effect 即把握できなかった
 *   (PiP button は title 既あり、3 button は漏れ)。
 *
 * 修正 (src/components/workspace/active-timer-panel.tsx, 5 line 追加 + 4 line comment 追加):
 *   3 <Button> に `title={同 aria-label}` 付与 (static + conditional)。aria-label / disabled /
 *   data-testid / onClick / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-active-timer-title-iter1793.ts
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

  const panel = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )

  // --- 1. pause button title 付与済 ---
  if (!panel.includes('title="一時停止 — タイマーを一時停止"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer pause button title が無い',
    })
  }

  // --- 2. resume button title 付与済 ---
  if (!panel.includes('title="再開 — タイマーを再開"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer resume button title が無い',
    })
  }

  // --- 3. stop button conditional 2 path text 維持 ---
  if (
    !panel.includes("'停止 — タイマーを停止して稼働記録を作成中…'") ||
    !panel.includes("'停止 — タイマーを停止して稼働記録に保存'")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer stop button conditional path text が消えている',
    })
  }

  // --- 4. PiP button title 維持 (iter1093 既あり、別 text) ---
  if (
    !panel.includes("'Chrome / Edge で利用可能'") ||
    !panel.includes("'PiP を閉じる'") ||
    !panel.includes("'常に手前表示で取り出す'")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer PiP button conditional title が消えている',
    })
  }

  // --- 5. iter1791 comment-post + quick-add submit title 維持 ---
  const thread = readFileSync(
    resolve(here, '../src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (!thread.includes("'投稿 — コメントを投稿 (Cmd/Ctrl+Enter でも可、@user で言及・通知)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1791 comment-post default title が消えている',
    })
  }
  const quickAdd = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')
  if (!quickAdd.includes('`作成 — 「${preview.title}」を作成 (Enter でも可)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1791 quick-add-submit default title が消えている',
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
      '(なし) — active-timer-panel pause/resume/stop button に title 付与で timer 操作 UX sighted hover disclosure、iter1791-1777 invariant 不変',
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

/**
 * Phase 6.15 loop iter1785: ItemEditDialog footer cancel + save button に title 付与
 * (iter1781 logout / iter1783 risk-board と同 pattern を dialog footer button にも展開、
 * dialog 操作 UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/item-edit-dialog.tsx の DialogFooter 内 2 button:
 *     - cancel button (line 1050-1059): aria-label `キャンセル — 「${item.title}」の編集を破棄`
 *     - save button (line 1064-1084): aria-label `保存 — 「${item.title}」を保存 (...)` 等 3 path
 *   は visible text "キャンセル" / "保存" のみ + aria-label で descriptive context を SR 提供だが、
 *   sighted は hover で target item.title / shortcut hint 即把握できなかった。
 *
 * 修正 (src/components/workspace/item-edit-dialog.tsx, 8 line 追加 + 6 line comment 追加):
 *   両 <Button> に `title={同 aria-label}` 付与 (cancel は static / save は conditional 3 path)。
 *   aria-label / disabled / data-testid / onClick / aria-keyshortcuts 完全不変、shadcn 編集なし、
 *   機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-item-edit-footer-title-iter1785.ts
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

  const dialog = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // --- 1. cancel button title 付与済 ---
  if (!dialog.includes('title={`キャンセル — 「${item.title}」の編集を破棄`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog cancel button に title が無い',
    })
  }

  // --- 2. save button title 件数 = aria-label 件数 (2 重 conditional) ---
  // aria-label conditional は 1 件、title conditional も 1 件、合計 title= 2 件 (cancel + save)
  const titleCount = (dialog.match(/\btitle=\{/g) ?? []).length
  if (titleCount < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-edit-dialog footer title 件数が ${titleCount} (期待 >= 3: header + cancel + save、保守的に >=3)`,
    })
  }

  // --- 3. save button title conditional 3 path 維持 (literal text check) ---
  if (
    !dialog.includes("'保存するにはタイトルを入力してください'") ||
    !dialog.includes('`保存中… — 「${item.title}」を保存中`') ||
    !dialog.includes(
      '`保存 — 「${item.title}」を保存 (Cmd/Ctrl+S でも可、楽観ロックで version が進む)`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog save button 3 path text が消えている',
    })
  }

  // --- 4. iter1754 ItemEditDialog header title={item.title} 維持 ---
  if (!dialog.includes('<span className="truncate" title={item.title}>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1754 ItemEditDialog header span title が消えている',
    })
  }

  // --- 5. iter1783 sprint-risk-board topRisk button title 維持 ---
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

  // --- 6. iter1781 home page logout title 維持 ---
  const homePage = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  if (!homePage.includes('title="ログアウト — ログイン画面に戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1781 home page logout title が消えている',
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
      '(なし) — ItemEditDialog footer cancel + save button に title 付与で dialog 操作 UX sighted hover disclosure、iter1783-1777 invariant 不変',
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

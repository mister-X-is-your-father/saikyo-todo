/**
 * Phase 6.15 loop iter1787: ItemEditDialog archive + unarchive button に title 付与
 * (iter1785 cancel/save と同 pattern を archive button family にも展開、
 * archive/unarchive UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/item-edit-dialog.tsx の DialogFooter 内 archive/unarchive:
 *     - unarchive button (line 863-892): aria-label conditional 2 path、no title
 *     - archive button (line 894-928): aria-label conditional 2 path、no title
 *   は visible text "アーカイブ復元" / "アーカイブ" + aria-label で descriptive context
 *   (target item.title / "後で復元可能" hint) を SR 提供だが、sighted は hover で
 *   context 即把握できなかった。
 *
 * 修正 (src/components/workspace/item-edit-dialog.tsx, 10 line 追加 + 6 line comment 追加):
 *   両 <Button> に conditional `title={同 aria-label}` 付与。aria-label / disabled /
 *   data-testid / onClick / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-item-edit-archive-title-iter1787.ts
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

  // --- 1. unarchive button title path text 維持 ---
  if (
    !dialog.includes('`復元中… — 「${item.title}」をアーカイブから復元中`') ||
    !dialog.includes('`アーカイブ復元 — 「${item.title}」をアーカイブから復元`')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'unarchive button conditional path text が消えている',
    })
  }

  // --- 2. archive button title path text 維持 ---
  if (
    !dialog.includes('`アーカイブ中… — 「${item.title}」をアーカイブ中…`') ||
    !dialog.includes('`アーカイブ — 「${item.title}」をアーカイブ (後で復元可能)`')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'archive button conditional path text が消えている',
    })
  }

  // --- 3. ItemEditDialog footer title 件数 >= 5 (header + cancel + save + archive + unarchive) ---
  // (注: archive/unarchive は条件分岐で同時には 1 個しか render されないが、source 中の
  // title= リテラルは両方含まれる)
  const titleCount = (dialog.match(/\btitle=\{/g) ?? []).length
  if (titleCount < 5) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-edit-dialog title 件数が ${titleCount} (期待 >= 5: header + cancel + save + archive + unarchive)`,
    })
  }

  // --- 4. iter1785 cancel button title 維持 ---
  if (!dialog.includes('title={`キャンセル — 「${item.title}」の編集を破棄`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1785 ItemEditDialog cancel title が消えている',
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
      '(なし) — ItemEditDialog archive + unarchive button に title 付与で archive UX sighted hover disclosure、iter1785-1777 invariant 不変',
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

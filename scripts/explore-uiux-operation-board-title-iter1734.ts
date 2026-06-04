/**
 * Phase 6.15 loop iter1734: operation-board-widget の ItemRow shared button に title 付与で
 * sighted hover で truncate item title を全 row 一括 disclose (iter1720 mock-entries /
 * iter1733 time-entries 同 pattern を operation-board の row 共通 component に展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/operation-board-widget.tsx ItemRow (line 482+) は
 *   `<span className="truncate" aria-hidden="true">{item.title}</span>` で visual truncate、
 *   button 自体に aria-label (full title) を持つが、aria-label は browser tooltip にならない。
 *   sighted は hover でも切れた title 全文を見れない。
 *
 * 影響: operation-board は今日の作戦盤の核 widget で複数 caller (today highlight / quickwins /
 *   focusBlocks / muted 等) が ItemRow を共通利用、共通 component への 1 修正で全 row 一括効果。
 *   長 title item の本文が sighted には見えず作戦盤の即把握性が下がる。
 *
 * 修正 (src/components/workspace/operation-board-widget.tsx ItemRow, 1 line + 7 line comment):
 *   <button> に `title={item.title}` 付与。aria-label / className / data-testid / 既存属性
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-operation-board-title-iter1734.ts
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

  const opBoard = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // --- 1. ItemRow button に title={item.title} 付与済 ---
  if (!opBoard.match(/title=\{item\.title\}/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board-widget.tsx ItemRow に title={item.title} が無い',
    })
  }

  // --- 2. data-testid="operation-board-row-${item.id}" 維持 ---
  if (!opBoard.includes('data-testid={`operation-board-row-${item.id}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board-widget.tsx ItemRow の data-testid が消えている',
    })
  }

  // --- 3. aria-label em-dash convention 維持 (iter1542) ---
  if (!opBoard.includes('編集ダイアログで開く')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'operation-board-widget.tsx ItemRow の aria-label "編集ダイアログで開く" が消えている',
    })
  }

  // --- 4. visible inner truncate span 維持 ---
  if (!opBoard.includes('<span className="truncate" aria-hidden="true">')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board-widget.tsx の visible truncate span が消えている',
    })
  }

  // --- 5. iter1733 reference invariant: time-entries-table title 維持 ---
  const timeEntriesTable = readFileSync(
    resolve(here, '../src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (!timeEntriesTable.match(/title=\{e\.description\s*\|\|\s*''\}/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1733 time-entries-table description title が消えている',
    })
  }

  // --- 6. iter1720 reference invariant: mock-entries description title 維持 ---
  const mockEntriesPage = readFileSync(
    resolve(here, '../src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )
  if (!mockEntriesPage.includes('title={e.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1720 mock-entries description title が消えている',
    })
  }

  // --- 7. iter1732 reference invariant: prefers-reduced-motion helper 維持 ---
  const helper = readFileSync(resolve(here, '../src/lib/ui/prefers-reduced-motion.ts'), 'utf8')
  if (!helper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1732 prefers-reduced-motion helper が消えている',
    })
  }

  // --- 8. iter1731 reference invariant: workspace nav 8 link data-testid 維持 ---
  const workspacePage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  const navTestIds = (workspacePage.match(/data-testid="nav-[a-z-]+"/g) ?? []).length
  if (navTestIds !== 8) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1731 workspace nav-* data-testid 件数が ${navTestIds} (期待 8)`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — operation-board-widget ItemRow に title 付与で全 row 一括 sighted hover disclosure、iter1733 / iter1720 / iter1732 / iter1731 invariant 不変',
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

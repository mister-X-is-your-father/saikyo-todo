/**
 * Phase 6.15 loop iter1733: time-entries-table description column に title 付与で
 * sighted hover で全文 disclose (iter1720 mock-entries 同 pattern を workspace に展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/time-entry/time-entries-table.tsx line 131 旧:
 *     <td className="max-w-[320px] truncate py-2">{e.description || '—'}</td>
 *   - truncate で 320px 超は visual ellipsis、sighted は切れた部分を見れない
 *   - title 属性無し → browser tooltip も無し
 *   - SR は DOM textContent 全部読む (no-op)、issue は sighted only
 *
 * 修正 (src/components/time-entry/time-entries-table.tsx, 4 line + 4 line comment):
 *   - <td> に `title={e.description || ''}` (description 非空なら hover tooltip)
 *   - className / textContent 不変、shadcn 編集なし、機能追加なし
 *   - empty description (= visible "—") は title="" で tooltip 非表示
 *
 * 実行: pnpm tsx scripts/explore-uiux-time-entries-description-title-iter1733.ts
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

  const timeEntriesTable = readFileSync(
    resolve(here, '../src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )

  // --- 1. description td に title={e.description || ''} 付与済 ---
  if (!timeEntriesTable.match(/title=\{e\.description\s*\|\|\s*''\}/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: "time-entries-table.tsx に title={e.description || ''} が無い",
    })
  }

  // --- 2. truncate className 維持 ---
  if (!timeEntriesTable.includes('max-w-[320px] truncate')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'time-entries-table.tsx の max-w-[320px] truncate が消えている',
    })
  }

  // --- 3. {e.description || '—'} body 維持 (empty fallback "—") ---
  if (!timeEntriesTable.includes("{e.description || '—'}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'time-entries-table.tsx の {e.description || "—"} body が消えている',
    })
  }

  // --- 4. iter1720 reference invariant: mock-entries description title 維持 ---
  const mockEntriesPage = readFileSync(
    resolve(here, '../src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )
  if (!mockEntriesPage.includes('title={e.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1720 mock-entries description title が消えている (sibling pattern)',
    })
  }

  // --- 5. iter1732 reference invariant: prefers-reduced-motion helper 維持 ---
  const helper = readFileSync(resolve(here, '../src/lib/ui/prefers-reduced-motion.ts'), 'utf8')
  if (!helper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1732 prefers-reduced-motion helper が消えている',
    })
  }

  // --- 6. iter1731 reference invariant: workspace nav 8 link data-testid 維持 ---
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

  // --- 7. iter1730 reference invariant: back-to-workspaces data-testid 維持 ---
  if (!workspacePage.includes('data-testid="back-to-workspaces"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1730 back-to-workspaces data-testid が消えている',
    })
  }

  // --- 8. time-entries-table の table-level data-testid 不変 (回帰 guard) ---
  if (!timeEntriesTable.includes('data-testid="time-entries-table"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'time-entries-table の data-testid="time-entries-table" が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — time-entries-table description column に title 付与で sighted hover disclosure 有効、iter1720 sibling pattern + iter1732 / iter1731 / iter1730 invariant 不変',
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

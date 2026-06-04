/**
 * Phase 6.15 loop iter1735: taskchute-view item title button に title 付与で sighted hover
 * で全 title disclose (iter1720/1733/1734 truncate + title sweep を taskchute にも)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/taskchute-view.tsx item title button (line 207-214) は
 *   `<span aria-hidden="true">{item.title}</span>` を `flex-1 truncate` の親で表示、
 *   button 自体は aria-label (full title + 編集) を持つが aria-label は browser tooltip
 *   にならず sighted は hover で全 title を見れない。
 *
 * 修正 (src/components/workspace/taskchute-view.tsx, 1 line + 4 line comment):
 *   <button> に `title={item.title}` 付与。aria-label / className / onClick / 既存属性
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-taskchute-title-iter1735.ts
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

  const taskchute = readFileSync(
    resolve(here, '../src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )

  // --- 1. taskchute item title button に title={item.title} 付与済 ---
  //   complex match: button block 内に title={item.title} 単一 instance あること。
  if (!taskchute.match(/title=\{item\.title\}/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'taskchute-view.tsx に title={item.title} が無い',
    })
  }

  // --- 2. aria-label "${item.title} — 編集" 維持 (iter1321) ---
  if (!taskchute.includes('aria-label={`${item.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'taskchute-view.tsx aria-label "${item.title} — 編集" が消えている',
    })
  }

  // --- 3. truncate className 維持 ---
  if (!taskchute.match(/flex-1\s+truncate/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'taskchute-view.tsx の flex-1 truncate className が消えている',
    })
  }

  // --- 4. iter1734 reference invariant: operation-board ItemRow title 維持 ---
  const opBoard = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!opBoard.includes('title={item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1734 operation-board ItemRow title={item.title} が消えている',
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
      '(なし) — taskchute-view item title button に title 付与で sighted hover で全 title disclose、iter1734 / iter1733 / iter1720 / iter1732 / iter1731 invariant 不変',
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

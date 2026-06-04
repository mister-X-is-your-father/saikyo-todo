/**
 * Phase 6.15 loop iter1738: archived-items-panel の row td に title 付与で sighted hover
 * で全 title disclose (iter1720-1737 sweep を archive にも展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/archived-items-panel.tsx の <td className="max-w-[300px] truncate">
 *   は truncate で長 title 切れ、内 <Link> は aria-label を持つが browser tooltip にならず
 *   sighted は hover で全 title を見れない (Link 自体に title 付与でも良いが <td> に
 *   付ければ row 全体 hover で disclose、layout simple)。
 *
 * 修正 (src/components/workspace/archived-items-panel.tsx, 1 line + 2 line comment):
 *   <td> に `title={item.title}` 付与。className / Link / aria-label / 既存属性 完全不変、
 *   shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-archive-title-iter1738.ts
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

  const archivedPanel = readFileSync(
    resolve(here, '../src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )

  // --- 1. archive row td に title={item.title} 付与済 ---
  if (!archivedPanel.match(/title=\{item\.title\}/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'archived-items-panel.tsx td に title={item.title} が無い',
    })
  }

  // --- 2. max-w-[300px] truncate className 維持 ---
  if (!archivedPanel.includes('max-w-[300px] truncate')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'archived-items-panel.tsx の max-w-[300px] truncate className が消えている',
    })
  }

  // --- 3. iter1300 aria-label em-dash convention 維持 ---
  if (
    !archivedPanel.includes(
      'aria-label={`${item.title} — 開く (${fmt(item.archivedAt)} にアーカイブ済み)`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'archived-items-panel.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 4. iter1737 reference invariant: today-view / period-view title 維持 ---
  const todayView = readFileSync(
    resolve(here, '../src/components/workspace/today-view.tsx'),
    'utf8',
  )
  const personalPeriodView = readFileSync(
    resolve(here, '../src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (!todayView.includes('title={it.title}') || !personalPeriodView.includes('title={it.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1737 today/period item title={it.title} が消えている',
    })
  }

  // --- 5. iter1736 reference invariant: inbox title 維持 ---
  const inboxView = readFileSync(
    resolve(here, '../src/components/workspace/inbox-view.tsx'),
    'utf8',
  )
  if (!inboxView.includes('title={it.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1736 inbox-view title={it.title} が消えている',
    })
  }

  // --- 6. iter1734 reference invariant: operation-board ItemRow title 維持 ---
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
      '(なし) — archived-items-panel td に title 付与で sighted hover で全 title disclose、iter1737 / iter1736 / iter1734 / iter1732 / iter1731 invariant 不変',
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

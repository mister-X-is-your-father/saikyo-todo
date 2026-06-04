/**
 * Phase 6.15 loop iter1754: ItemEditDialog DialogTitle 内 title span に title 付与で
 * sighted hover で全 item title disclose (iter1720-1753 sweep を modal header にも展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/item-edit-dialog.tsx DialogTitle 内 line 301 旧:
 *     <span className="truncate">{item.title}</span>
 *   は truncate で長 item.title 切れ、DialogTitle 自体は aria-label 無 (textContent が SR label)、
 *   sighted は hover で全 title 見れず、modal 内容を即把握できない。
 *
 * 修正 (src/components/workspace/item-edit-dialog.tsx, 6 line 差替 + 5 line comment):
 *   <span> に `title={item.title}` 付与。className / textContent 完全不変、shadcn 編集なし、
 *   機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-item-edit-dialog-title-iter1754.ts
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

  // --- 1. DialogTitle 内 title span に title={item.title} 付与済 ---
  if (!dialog.match(/<span className="truncate" title=\{item\.title\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog.tsx DialogTitle span に title={item.title} が無い',
    })
  }

  // --- 2. DialogTitle / DialogHeader 構造 維持 ---
  if (!dialog.includes('<DialogHeader>') || !dialog.includes('<DialogTitle')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog.tsx DialogHeader / DialogTitle 構造が消えている',
    })
  }

  // --- 3. iter1753 reference invariant: dashboard DoD title 維持 ---
  const dashboardView = readFileSync(
    resolve(here, '../src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (!dashboardView.includes('title={item.dod}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1753 dashboard DoD title が消えている',
    })
  }

  // --- 4. iter1752 reference invariant: quick-add preview title 維持 ---
  const quickAdd = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')
  if (!quickAdd.includes('title={preview.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1752 quick-add preview title が消えている',
    })
  }

  // --- 5. iter1751 reference invariant: subtasks/dependencies title 維持 ---
  const subtasksPanel = readFileSync(
    resolve(here, '../src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (!subtasksPanel.includes('title={item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1751 subtasks-panel title が消えている',
    })
  }

  // --- 6. iter1747 reference invariant: dashboard MUST title 維持 ---
  if (
    !dashboardView.match(
      /data-testid=\{`dashboard-must-title-\$\{item\.id\}`\}[\s\S]{0,1500}title=\{item\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1747 dashboard MUST title が消えている',
    })
  }

  // --- 7. iter1734 reference invariant: operation-board ItemRow title 維持 ---
  const opBoard = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (
    !opBoard.match(
      /data-testid=\{`operation-board-row-\$\{item\.id\}`\}[\s\S]{0,1500}title=\{item\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1734 operation-board ItemRow title が消えている',
    })
  }

  // --- 8. iter1732 reference invariant: prefers-reduced-motion helper 維持 ---
  const helper = readFileSync(resolve(here, '../src/lib/ui/prefers-reduced-motion.ts'), 'utf8')
  if (!helper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1732 prefers-reduced-motion helper が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — ItemEditDialog DialogTitle span に title 付与で sighted hover で modal title disclose、iter1753-1732 invariant 不変',
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

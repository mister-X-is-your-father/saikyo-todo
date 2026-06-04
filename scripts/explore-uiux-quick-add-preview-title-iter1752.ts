/**
 * Phase 6.15 loop iter1752: quick-add preview title span に title 付与で sighted hover で
 * 全 preview.title disclose (iter1720-1751 sweep を quick-add にも展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/quick-add.tsx の preview title span (line 216) は
 *   `<span className="truncate font-mono" aria-hidden="true">→ {preview.title}</span>` で
 *   長 preview.title 切れ、parent の role="status" aria-label "解析結果 — X" は browser
 *   tooltip にならず sighted は hover で全 preview title 見れず。
 *
 * 修正 (src/components/workspace/quick-add.tsx, 1 line + 3 line comment):
 *   <span> に `title={preview.title}` 付与。className / aria-hidden / textContent 完全不変、
 *   shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-quick-add-preview-title-iter1752.ts
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

  const quickAdd = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')

  // --- 1. quick-add preview span に title={preview.title} 付与済 ---
  if (
    !quickAdd.match(
      /<span className="truncate font-mono" aria-hidden="true" title=\{preview\.title\}>/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add.tsx preview span に title={preview.title} が無い',
    })
  }

  // --- 2. truncate font-mono className 維持 ---
  if (!quickAdd.includes('className="truncate font-mono"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add.tsx preview span の truncate font-mono className が消えている',
    })
  }

  // --- 3. iter1751 reference invariant: subtasks/dependencies title 維持 ---
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

  // --- 4. iter1750 reference invariant: command-palette CommandItem title 維持 ---
  const cmdPalette = readFileSync(
    resolve(here, '../src/components/shared/command-palette.tsx'),
    'utf8',
  )
  if (
    !cmdPalette.match(
      /data-testid=\{`palette-item-\$\{item\.id\}`\}[\s\S]{0,1000}title=\{item\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1750 command-palette CommandItem title が消えている',
    })
  }

  // --- 5. iter1749 reference invariant: workspace-header h1 title 維持 ---
  const workspaceHeader = readFileSync(
    resolve(here, '../src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  if (!workspaceHeader.match(/<h1 className="truncate text-2xl font-bold" title=\{title\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1749 workspace-header h1 title が消えている',
    })
  }

  // --- 6. iter1747 reference invariant: dashboard MUST title 維持 ---
  const dashboardView = readFileSync(
    resolve(here, '../src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
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
      '(なし) — quick-add preview span に title 付与で sighted hover で preview.title disclose、iter1751-1732 invariant 不変',
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

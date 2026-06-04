/**
 * Phase 6.15 loop iter1751: subtasks-panel + item-dependencies-panel の title span に title
 * 付与 (iter1720-1750 sweep を subtasks + dependencies にも展開、item-edit-dialog 内
 * 主要 list 両方完成)。
 *
 * 発見した UX gap (sighted only):
 *   - subtasks-panel.tsx line 199 旧 `<span className={... truncate ...}>{item.title}</span>`
 *   - item-dependencies-panel.tsx line 352 旧 `<span className="flex-1 truncate">{ref.title}</span>`
 *   両方 truncate で長 title 切れ、title 属性 / aria-label 無し、sighted は hover で全 title 見れず。
 *
 * 修正 (2 file 各 1 line + 3 line comment):
 *   - subtasks-panel: span に `title={item.title}` 付与
 *   - item-dependencies-panel: span に `title={ref.title}` 付与
 *   - className / textContent / 既存属性 完全不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-subtasks-dependencies-title-iter1751.ts
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

  const subtasksPanel = readFileSync(
    resolve(here, '../src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  const depPanel = readFileSync(
    resolve(here, '../src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )

  // --- 1. subtasks-panel span に title={item.title} 付与済 ---
  if (!subtasksPanel.includes('title={item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel.tsx に title={item.title} が無い',
    })
  }

  // --- 2. item-dependencies-panel span に title={ref.title} 付与済 ---
  if (!depPanel.includes('title={ref.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-dependencies-panel.tsx に title={ref.title} が無い',
    })
  }

  // --- 3. subtasks-panel truncate className 維持 ---
  if (!subtasksPanel.match(/className=\{`flex-1 truncate/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel.tsx の flex-1 truncate className が消えている',
    })
  }

  // --- 4. item-dependencies-panel truncate className 維持 ---
  if (!depPanel.includes('className="flex-1 truncate"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-dependencies-panel.tsx の flex-1 truncate className が消えている',
    })
  }

  // --- 5. iter1750 reference invariant: command-palette CommandItem title 維持 ---
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

  // --- 6. iter1749 reference invariant: workspace-header h1 title 維持 ---
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
      '(なし) — subtasks-panel + item-dependencies-panel に title 付与で sighted hover disclose、iter1750-1732 invariant 不変',
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

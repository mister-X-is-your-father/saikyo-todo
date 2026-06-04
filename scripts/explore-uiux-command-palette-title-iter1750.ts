/**
 * Phase 6.15 loop iter1750: command-palette task search 結果 CommandItem に title 付与で
 * sighted hover で全 task title disclose (iter1720-1749 sweep を Cmd+K palette にも展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/shared/command-palette.tsx CommandItem (line 146+) は inner span
 *   `<span className="truncate">{item.title}</span>` で長 task title 切れ、CommandItem 自体は
 *   aria-label 持つが browser tooltip にならず sighted は hover で全 title 見れない。
 *
 * 修正 (src/components/shared/command-palette.tsx, 1 line + 5 line comment):
 *   <CommandItem> に `title={item.title}` 付与。data-testid / onSelect / value / 既存属性
 *   完全不変、shadcn 編集なし、機能追加なし (CommandItem は cmdk wrapper、props pass-through OK)。
 *
 * 実行: pnpm tsx scripts/explore-uiux-command-palette-title-iter1750.ts
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

  const cmdPalette = readFileSync(
    resolve(here, '../src/components/shared/command-palette.tsx'),
    'utf8',
  )

  // --- 1. CommandItem に title={item.title} 付与済 ---
  if (
    !cmdPalette.match(
      /data-testid=\{`palette-item-\$\{item\.id\}`\}[\s\S]{0,1000}title=\{item\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'command-palette.tsx CommandItem に title={item.title} が無い',
    })
  }

  // --- 2. data-testid="palette-item-${item.id}" 維持 ---
  if (!cmdPalette.includes('data-testid={`palette-item-${item.id}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'command-palette.tsx CommandItem data-testid が消えている',
    })
  }

  // --- 3. truncate span 維持 ---
  if (!cmdPalette.includes('<span className="truncate">{item.title}</span>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'command-palette.tsx の truncate span が消えている',
    })
  }

  // --- 4. iter1749 reference invariant: workspace-header h1 title 維持 ---
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

  // --- 5. iter1748 reference invariant: decompose-proposals title 維持 ---
  const decomposePanel = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!decomposePanel.includes('title={proposal.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1748 decompose-proposals title が消えている',
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
      '(なし) — command-palette CommandItem に title 付与で task search 結果が hover で disclose、iter1749-1732 invariant 不変',
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

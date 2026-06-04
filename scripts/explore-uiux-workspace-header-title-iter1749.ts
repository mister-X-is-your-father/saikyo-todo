/**
 * Phase 6.15 loop iter1749: workspace-header h1 + subtitle p に title 付与で sighted hover
 * で全 workspace title / subtitle disclose (iter1720-1748 sweep を workspace-header にも展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/workspace-header.tsx:
 *     - line 33 旧 <h1 className="truncate text-2xl font-bold">{title}</h1>
 *     - line 58 旧 <p className="text-muted-foreground mt-1 truncate text-xs">{subtitle}</p>
 *   両方 truncate で長 title/subtitle 切れ、title 属性 無し、aria-label 無し、sighted は
 *   hover で全文を見れない。
 *
 * 修正 (src/components/workspace/workspace-header.tsx, 6 line 差替 + 4 line comment):
 *   - h1 に `title={title}` 付与
 *   - p に `title={subtitle}` 付与
 *   - className / textContent / 既存属性 完全不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-workspace-header-title-iter1749.ts
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

  const workspaceHeader = readFileSync(
    resolve(here, '../src/components/workspace/workspace-header.tsx'),
    'utf8',
  )

  // --- 1. h1 に title={title} 付与済 ---
  if (!workspaceHeader.match(/<h1 className="truncate text-2xl font-bold" title=\{title\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header.tsx h1 に title={title} が無い',
    })
  }

  // --- 2. subtitle p に title={subtitle} 付与済 ---
  if (
    !workspaceHeader.match(
      /<p className="text-muted-foreground mt-1 truncate text-xs" title=\{subtitle\}>/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header.tsx subtitle p に title={subtitle} が無い',
    })
  }

  // --- 3. iter1563 header aria-label 維持 ---
  if (!workspaceHeader.includes('aria-label={`${title} — Workspace`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header.tsx header aria-label em-dash convention が消えている',
    })
  }

  // --- 4. iter1748 reference invariant: decompose-proposals title 維持 ---
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

  // --- 5. iter1747 reference invariant: dashboard MUST title 維持 ---
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

  // --- 6. iter1745 reference invariant: sprint-risk-board title 維持 ---
  const riskBoard = readFileSync(
    resolve(here, '../src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (!riskBoard.includes('title={load.name}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1745 sprint-risk-board title が消えている',
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
      '(なし) — workspace-header h1 + subtitle p に title 付与で sighted hover disclose、iter1748-1732 invariant 不変',
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

/**
 * Phase 6.15 loop iter1748: decompose-proposals-panel の proposal edit button に title 付与
 * (iter1720-1747 sweep を decompose-proposals にも展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/decompose-proposals-panel.tsx の proposal edit button (line 566+)
 *   は内 inner span `<span className="truncate font-medium">{proposal.title}</span>` で長
 *   proposal.title 切れ、aria-label は browser tooltip にならず sighted は hover で全 title
 *   見れない。
 *
 * 修正 (src/components/workspace/decompose-proposals-panel.tsx, 1 line + 4 line comment):
 *   <button> に `title={proposal.title}` 付与。aria-label / className / onClick / data-testid
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-decompose-proposal-title-iter1748.ts
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

  const decomposePanel = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // --- 1. proposal edit button に title={proposal.title} 付与済 ---
  if (
    !decomposePanel.match(
      /data-testid=\{`proposal-\$\{proposal\.id\}-edit-btn`\}[\s\S]{0,1500}title=\{proposal\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel.tsx button に title={proposal.title} が無い',
    })
  }

  // --- 2. iter1148 aria-label em-dash convention 維持 ---
  if (
    !decomposePanel.includes(
      "aria-label={`${proposal.title} — 提案を編集${proposal.isMust ? ' (MUST)' : ''}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 3. iter1747 reference invariant: dashboard MUST title 維持 ---
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

  // --- 4. iter1746 reference invariant: op-board quick-wins title 維持 ---
  const opBoard = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (
    !opBoard.match(
      /aria-label=\{`\$\{it\.title\} を開く — 見積 \$\{it\.estimateMin\}分`\}\s*\n\s*title=\{it\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1746 operation-board quick-wins title が消えている',
    })
  }

  // --- 5. iter1745 reference invariant: sprint-risk-board title 維持 ---
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

  // --- 6. iter1744 reference invariant: tag-picker title 維持 ---
  const tagPicker = readFileSync(
    resolve(here, '../src/components/workspace/tag-picker.tsx'),
    'utf8',
  )
  if (
    !tagPicker.match(/title=\{\s*\n?\s*selectedLabels\.length > 0[\s\S]{0,400}:\s*undefined\s*\}/)
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1744 tag-picker title が消えている',
    })
  }

  // --- 7. iter1734 reference invariant: operation-board ItemRow title 維持 ---
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
      '(なし) — decompose-proposals proposal edit button に title 付与、iter1747-1732 invariant 不変',
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

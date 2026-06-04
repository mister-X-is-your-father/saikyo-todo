/**
 * Phase 6.15 loop iter1756: decompose-proposals-panel の line-clamp <p> 2 個に title 付与
 * (iter1755 sprints/goals line-clamp と pair で line-clamp sweep の decompose 展開)。
 *
 * 発見した UX gap (sighted only):
 *   - line 149 旧 <p className="...line-clamp-3...">{streaming text}</p>
 *     AI 分解の thinking text、line-clamp で 3 行超切れ、sighted は全 streaming 進捗見れず
 *   - line 596 旧 <p className="...line-clamp-2...">{proposal.description}</p>
 *     proposal description、line-clamp で 2 行超切れ、sighted は hover で全 description 見れず
 *
 * 修正 (src/components/workspace/decompose-proposals-panel.tsx, 8 line 差替 + 6 line comment):
 *   - streaming text <p> に `title={progress.streamingText || '思考中…'}` 付与
 *   - description <p> に `title={proposal.description}` 付与
 *   - className / textContent / data-testid 完全不変、shadcn 編集なし、機能追加なし
 *   - iter1748 proposal title button title と組み合わせて decompose-proposals 内全 disclose 完成
 *
 * 実行: pnpm tsx scripts/explore-uiux-decompose-line-clamp-title-iter1756.ts
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

  // --- 1. streaming text <p> に title 付与済 ---
  if (
    !decomposePanel.match(
      /data-testid="agent-streaming-text"\s*\n?\s*title=\{progress\.streamingText \|\| '思考中…'\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel.tsx streaming text <p> に title が無い',
    })
  }

  // --- 2. proposal description <p> に title={proposal.description} 付与済 ---
  if (
    !decomposePanel.match(
      /className="text-muted-foreground mt-0\.5 line-clamp-2 text-xs"\s*\n?\s*title=\{proposal\.description\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel.tsx description <p> に title が無い',
    })
  }

  // --- 3. iter1748 proposal edit button title 維持 (本 file 内 sibling) ---
  if (!decomposePanel.includes('title={proposal.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1748 decompose-proposals proposal title が消えている',
    })
  }

  // --- 4. iter1755 reference invariant: sprints/goals line-clamp title 維持 ---
  const sprintsPanel = readFileSync(
    resolve(here, '../src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (!sprintsPanel.includes('title={sprint.goal}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1755 sprints-panel line-clamp title が消えている',
    })
  }

  // --- 5. iter1754 reference invariant: ItemEditDialog DialogTitle title 維持 ---
  const dialog = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (!dialog.match(/<span className="truncate" title=\{item\.title\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1754 ItemEditDialog DialogTitle title が消えている',
    })
  }

  // --- 6. iter1751 reference invariant: subtasks/dependencies title 維持 ---
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
      '(なし) — decompose-proposals streaming text + description <p> に title 付与で sighted hover disclose、iter1755-1732 invariant 不変',
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

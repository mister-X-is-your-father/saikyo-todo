/**
 * Phase 6.15 loop iter1755: sprints-panel + goals-panel の line-clamp <p> に title 付与で
 * sighted hover で全 text disclose (iter1720-1754 truncate sweep の line-clamp counterpart)。
 *
 * 発見した UX gap (sighted only):
 *   - sprints-panel.tsx line 558 旧 <p className="text-muted-foreground line-clamp-2 text-xs">{sprint.goal}</p>
 *   - goals-panel.tsx line 519 旧 <p className="text-muted-foreground mt-2 line-clamp-3 pl-7 text-xs">{goal.description}</p>
 *   両方 line-clamp で N 行超切れ、title 属性無、sighted は hover で全文見れず。
 *   truncate と同様の disclosure pattern を line-clamp にも適用。
 *
 * 修正 (2 file 各 1 line + 3 line comment):
 *   - sprints-panel: <p> に `title={sprint.goal}` 付与
 *   - goals-panel: <p> に `title={goal.description}` 付与
 *   - className / textContent 完全不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-line-clamp-title-iter1755.ts
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

  const sprintsPanel = readFileSync(
    resolve(here, '../src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const goalsPanel = readFileSync(
    resolve(here, '../src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // --- 1. sprints-panel goal <p> に title={sprint.goal} 付与済 ---
  if (
    !sprintsPanel.match(
      /className="text-muted-foreground line-clamp-2 text-xs"\s*\n?\s*title=\{sprint\.goal\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprints-panel.tsx goal <p> に title={sprint.goal} が無い',
    })
  }

  // --- 2. goals-panel description <p> に title={goal.description} 付与済 ---
  if (
    !goalsPanel.match(
      /className="text-muted-foreground mt-2 line-clamp-3 pl-7 text-xs"\s*\n?\s*title=\{goal\.description\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel.tsx description <p> に title={goal.description} が無い',
    })
  }

  // --- 3. iter1754 reference invariant: ItemEditDialog DialogTitle title 維持 ---
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

  // --- 4. iter1753 reference invariant: dashboard DoD title 維持 ---
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

  // --- 5. iter1751 reference invariant: subtasks-panel title 維持 ---
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

  // --- 6. iter1739 reference invariant: sprints-panel CardTitle title 維持 ---
  if (!sprintsPanel.includes('title={sprint.name}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1739 sprints-panel CardTitle title={sprint.name} が消えている',
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
      '(なし) — sprints + goals の line-clamp <p> に title 付与で sighted hover で全文 disclose、iter1754-1732 invariant 不変',
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

/**
 * Phase 6.15 loop iter1739: sprints-panel + goals-panel の CardTitle (truncate) に title 付与
 * (iter1720-1738 sweep を sprint / goal card にも展開)。
 *
 * 発見した UX gap (sighted only):
 *   - src/components/workspace/sprints-panel.tsx CardTitle (line 518+) は
 *     `className="truncate text-base"` で長 sprint name 切れ、aria-label 無く
 *     textContent が SR label、sighted は hover で全 name 見れない
 *   - src/components/workspace/goals-panel.tsx CardTitle (line 442+) も同 gap
 *
 * 修正 (2 file 各 1 line + 3 line comment):
 *   - sprints-panel: CardTitle に `title={sprint.name}` 付与
 *   - goals-panel: CardTitle に `title={goal.title}` 付与
 *   - className / id / role / aria-level / textContent 全て不変
 *   - shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-sprints-goals-card-title-iter1739.ts
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

  // --- 1. sprints-panel CardTitle に title={sprint.name} 付与済 ---
  if (
    !sprintsPanel.match(
      /id=\{`sprint-card-heading-\$\{sprint\.id\}`\}[\s\S]{0,300}title=\{sprint\.name\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprints-panel.tsx CardTitle に title={sprint.name} が無い',
    })
  }

  // --- 2. goals-panel CardTitle に title={goal.title} 付与済 ---
  if (
    !goalsPanel.match(/id=\{`goal-card-heading-\$\{goal\.id\}`\}[\s\S]{0,300}title=\{goal\.title\}/)
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel.tsx CardTitle に title={goal.title} が無い',
    })
  }

  // --- 3. truncate className 維持 ---
  if (!sprintsPanel.includes('className="truncate text-base"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprints-panel.tsx CardTitle truncate className が消えている',
    })
  }
  if (!goalsPanel.includes('className="truncate text-base"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel.tsx CardTitle truncate className が消えている',
    })
  }

  // --- 4. role="heading" + aria-level={3} 維持 ---
  if (
    !sprintsPanel.match(/role="heading"\s*\n?\s*aria-level=\{3\}/) ||
    !goalsPanel.match(/role="heading"\s*\n?\s*aria-level=\{3\}/)
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprints/goals-panel CardTitle role="heading" + aria-level={3} が消えている',
    })
  }

  // --- 5. iter1738 reference invariant: archived-items-panel title 維持 ---
  const archivedPanel = readFileSync(
    resolve(here, '../src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (!archivedPanel.includes('title={item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1738 archived-items-panel td title={item.title} が消えている',
    })
  }

  // --- 6. iter1737 reference invariant: today/period title 維持 ---
  const todayView = readFileSync(
    resolve(here, '../src/components/workspace/today-view.tsx'),
    'utf8',
  )
  if (!todayView.includes('title={it.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1737 today-view title={it.title} が消えている',
    })
  }

  // --- 7. iter1734 reference invariant: operation-board ItemRow title 維持 ---
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
      '(なし) — sprints + goals card CardTitle に title 付与で sighted hover で全 name disclose、iter1738 / iter1737 / iter1734 / iter1732 invariant 不変',
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

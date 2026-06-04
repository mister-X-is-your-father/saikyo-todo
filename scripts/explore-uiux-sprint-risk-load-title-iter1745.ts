/**
 * Phase 6.15 loop iter1745: sprint-risk-board-widget の assigneeLoad td (line 194) に title
 * 付与で sighted hover で長 load.name disclose (iter1720-1744 sweep を sprint-risk-board の
 * 補完、line 91 topRisk title は既に持つ、本 iter で td 残追加で完備)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/sprint/sprint-risk-board-widget.tsx 旧 line 194:
 *     <td className="truncate py-1">{load.name}</td>
 *   は assigneeLoad row name (担当者 / Agent 名) を truncate で切る、title 無で sighted
 *   hover で全 name 見れない (line 91 topRisk titleEl は既に title 持つ)。
 *
 * 修正 (src/components/sprint/sprint-risk-board-widget.tsx, 4 line 差替 + 3 line comment):
 *   <td> に `title={load.name}` 付与。className / textContent 不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-sprint-risk-load-title-iter1745.ts
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

  const riskBoard = readFileSync(
    resolve(here, '../src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )

  // --- 1. assigneeLoad td に title={load.name} 付与済 ---
  if (!riskBoard.match(/<td className="truncate py-1" title=\{load\.name\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-risk-board-widget.tsx assigneeLoad td に title={load.name} が無い',
    })
  }

  // --- 2. topRisk titleEl の既存 title={entry.item.title} 維持 (line 91) ---
  if (!riskBoard.includes('title={entry.item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-risk-board-widget.tsx の topRisk titleEl title が消えている',
    })
  }

  // --- 3. data-testid="risk-load-row-${load.id}" 維持 (回帰 guard) ---
  if (!riskBoard.includes('data-testid={`risk-load-row-${load.id}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-risk-board-widget.tsx の risk-load-row data-testid が消えている',
    })
  }

  // --- 4. iter1744 reference invariant: tag-picker title 維持 ---
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

  // --- 5. iter1743 reference invariant: assignee-picker title 維持 ---
  const assigneePicker = readFileSync(
    resolve(here, '../src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (
    !assigneePicker.includes(
      "title={selectedLabels.length > 0 ? selectedLabels.join(', ') : undefined}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1743 assignee-picker title が消えている',
    })
  }

  // --- 6. iter1742 reference invariant: gantt-view 左列 title 維持 ---
  const ganttView = readFileSync(
    resolve(here, '../src/components/workspace/gantt-view.tsx'),
    'utf8',
  )
  if (!ganttView.match(/<span className="truncate" title=\{item\.title\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1742 gantt-view 左列 title が消えている',
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
      '(なし) — sprint-risk-board assigneeLoad td に title 付与、widget 内 truncate 全網羅、iter1744-1732 invariant 不変',
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

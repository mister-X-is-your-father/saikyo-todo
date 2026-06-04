/**
 * Phase 6.15 loop iter1743: assignee-picker trigger button に title 付与で sighted hover で
 * 全 member list disclose (iter1720-1742 sweep を picker にも展開、多選択 list visibility 改善)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/assignee-picker.tsx trigger Button の inner span は
 *   `<span className="truncate">{selectedLabels.join(', ')}</span>` で多 member 時 list
 *   切れ、aria-label を持つが browser tooltip にならず sighted は hover で全 member 見れない。
 *
 * 修正 (src/components/workspace/assignee-picker.tsx, 1 line + 4 line comment):
 *   <Button> に `title={selectedLabels.length > 0 ? selectedLabels.join(', ') : undefined}`
 *   を付与 (空時は undefined で tooltip 非表示)。aria-label / className / 既存属性 不変、
 *   shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-assignee-picker-title-iter1743.ts
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

  const assigneePicker = readFileSync(
    resolve(here, '../src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )

  // --- 1. assignee-picker Button に title (selectedLabels.length condition) 付与済 ---
  if (
    !assigneePicker.includes(
      "title={selectedLabels.length > 0 ? selectedLabels.join(', ') : undefined}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker.tsx Button に title (selectedLabels 条件) が無い',
    })
  }

  // --- 2. iter1123 aria-label 維持 (visible-prefix em-dash) ---
  if (
    !assigneePicker.includes("'未アサイン — アサインを選択 (現在未アサイン)'") ||
    !assigneePicker.includes(
      "`${selectedLabels.join(', ')} — アサインを選択 (現在 ${selectedLabels.length} 件)`",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker.tsx aria-label visible-prefix em-dash convention が消えている',
    })
  }

  // --- 3. iter1742 reference invariant: gantt-view 左列 title 維持 ---
  const ganttView = readFileSync(
    resolve(here, '../src/components/workspace/gantt-view.tsx'),
    'utf8',
  )
  if (!ganttView.match(/<span className="truncate" title=\{item\.title\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1742 gantt-view 左列 row label title が消えている',
    })
  }

  // --- 4. iter1741 reference invariant: integrations + template title 維持 ---
  const integrations = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!integrations.includes('title={src.name}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1741 integrations-panel title が消えている',
    })
  }

  // --- 5. iter1740 reference invariant: workflows title 維持 ---
  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (!wfPanel.includes('title={wf.name}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1740 workflows-panel title が消えている',
    })
  }

  // --- 6. iter1739 reference invariant: sprints/goals title 維持 ---
  const sprintsPanel = readFileSync(
    resolve(here, '../src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (!sprintsPanel.includes('title={sprint.name}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1739 sprints-panel title が消えている',
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
      '(なし) — assignee-picker trigger Button に title 付与で sighted hover で全 member list disclose、iter1742-1734 / iter1732 invariant 不変',
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

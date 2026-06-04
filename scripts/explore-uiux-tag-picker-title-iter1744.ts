/**
 * Phase 6.15 loop iter1744: tag-picker trigger Button に title 付与で sighted hover で
 * 全 tag list disclose (iter1743 assignee-picker の sibling、picker family 全完成)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/tag-picker.tsx trigger Button は多 tag 時 inner truncate で
 *   tag list 切れ、aria-label を持つが browser tooltip にならず sighted は hover で全 tag
 *   見れない (assignee-picker iter1743 と完全 sibling)。
 *
 * 修正 (src/components/workspace/tag-picker.tsx, 8 line + 3 line comment):
 *   <Button> に conditional `title=...` 付与:
 *     - selectedLabels.length > 0 → tag names join(', ')
 *     - 空 → undefined (tooltip 非表示)
 *   aria-label / className / 既存属性 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-tag-picker-title-iter1744.ts
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

  const tagPicker = readFileSync(
    resolve(here, '../src/components/workspace/tag-picker.tsx'),
    'utf8',
  )

  // --- 1. tag-picker Button に title (conditional) 付与済 ---
  if (
    !tagPicker.match(/title=\{\s*\n?\s*selectedLabels\.length > 0[\s\S]{0,400}:\s*undefined\s*\}/)
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-picker.tsx Button に conditional title が無い',
    })
  }

  // --- 2. iter1072 / iter1124 aria-label em-dash convention 維持 ---
  if (
    !tagPicker.includes("'タグなし — タグを選択 (現在なし)'") ||
    !tagPicker.includes('— タグを選択 (現在 ${selectedLabels.length} 件)')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-picker.tsx aria-label visible-prefix em-dash convention が消えている',
    })
  }

  // --- 3. iter1743 reference invariant: assignee-picker title 維持 (sibling) ---
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
      message: 'iter1743 assignee-picker title が消えている (sibling pattern)',
    })
  }

  // --- 4. iter1742 reference invariant: gantt-view 左列 title 維持 ---
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
      '(なし) — tag-picker trigger Button に title 付与で sighted hover で全 tag list disclose、iter1743 assignee-picker sibling pattern 完成、iter1742-1732 invariant 不変',
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

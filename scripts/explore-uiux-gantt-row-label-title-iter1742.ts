/**
 * Phase 6.15 loop iter1742: gantt-view 左列 row label の truncate span に title 付与で
 * sighted hover で全 item title disclose (iter1720-1741 sweep を gantt 左列にも展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/gantt-view.tsx 左列 row label (line 676 旧) は
 *   `<span className="truncate">{item.title}</span>` で長 title 切れ、aria-label 無し、
 *   sighted は hover で全 title を見れない (右側 gantt bar は line 798 で既に title 持つ)。
 *
 * 修正 (src/components/workspace/gantt-view.tsx, 3 line 差替 + 2 line comment):
 *   <span className="truncate"> に `title={item.title}` 付与。className / textContent 不変、
 *   shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-gantt-row-label-title-iter1742.ts
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

  const ganttView = readFileSync(
    resolve(here, '../src/components/workspace/gantt-view.tsx'),
    'utf8',
  )

  // --- 1. gantt-view 左列 row label span に title={item.title} 付与済 ---
  if (!ganttView.match(/<span className="truncate" title=\{item\.title\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx 左列 row label span に title={item.title} が無い',
    })
  }

  // --- 2. 右側 bar の既存 title 維持 (line 798) ---
  if (!ganttView.includes('${item.title} — ${format(start, ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx の bar title (date range) が消えている',
    })
  }

  // --- 3. iter1741 reference invariant: integrations + template title 維持 ---
  const integrations = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const templateEditor = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!integrations.includes('title={src.name}') || !templateEditor.includes('title={it.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1741 integrations/template title が消えている',
    })
  }

  // --- 4. iter1740 reference invariant: workflows-panel title 維持 ---
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

  // --- 5. iter1739 reference invariant: sprints/goals title 維持 ---
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

  // --- 6. iter1738 reference invariant: archived-items-panel title 維持 ---
  const archivedPanel = readFileSync(
    resolve(here, '../src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (!archivedPanel.includes('title={item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1738 archived-items-panel title が消えている',
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
      '(なし) — gantt-view 左列 row label に title 付与で sighted hover disclosure (右側 bar は既に title 持つ)、iter1741 / iter1740 / iter1739 / iter1738 / iter1734 / iter1732 invariant 不変',
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

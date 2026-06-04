/**
 * Phase 6.15 loop iter1741: integrations-panel CardTitle + template-items-editor span に
 * title 付与で sighted hover で全 name disclose (iter1720-1740 sweep を integrations / template
 * にも展開、5 entity card pattern 完成: item/sprint/goal/workflow/source)。
 *
 * 発見した UX gap (sighted only):
 *   - src/components/integrations/integrations-panel.tsx CardTitle (line 129+) は
 *     `truncate text-base` で長 src.name 切れ、aria-label 無し
 *   - src/components/template/template-items-editor.tsx item title span (line 223) も同 gap
 *
 * 修正 (2 file 各 1 line + 3 line comment):
 *   - integrations-panel: CardTitle に `title={src.name}` 付与
 *   - template-items-editor: span に `title={it.title}` 付与
 *   - className / id / role / aria-level / textContent 完全不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-integrations-template-title-iter1741.ts
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

  const integrations = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const templateEditor = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )

  // --- 1. integrations-panel CardTitle に title={src.name} 付与済 ---
  if (
    !integrations.match(/id=\{`src-card-heading-\$\{src\.id\}`\}[\s\S]{0,500}title=\{src\.name\}/)
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel.tsx CardTitle に title={src.name} が無い',
    })
  }

  // --- 2. template-items-editor span に title={it.title} 付与済 ---
  if (!templateEditor.match(/<span className="flex-1 truncate" title=\{it\.title\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-items-editor.tsx span に title={it.title} が無い',
    })
  }

  // --- 3. iter1740 reference invariant: workflows-panel CardTitle title 維持 ---
  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (!wfPanel.includes('title={wf.name}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1740 workflows-panel title={wf.name} が消えている',
    })
  }

  // --- 4. iter1739 reference invariant: sprints/goals CardTitle title 維持 ---
  const sprintsPanel = readFileSync(
    resolve(here, '../src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const goalsPanel = readFileSync(
    resolve(here, '../src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (!sprintsPanel.includes('title={sprint.name}') || !goalsPanel.includes('title={goal.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1739 sprints/goals CardTitle title が消えている',
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
      message: 'iter1738 archived-items-panel title が消えている',
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
      message: 'iter1737 today-view title が消えている',
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
      '(なし) — integrations-panel + template-items-editor に title 付与で sighted hover disclosure、iter1740 / iter1739 / iter1738 / iter1737 / iter1734 / iter1732 invariant 不変',
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

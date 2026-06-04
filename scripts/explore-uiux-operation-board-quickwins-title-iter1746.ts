/**
 * Phase 6.15 loop iter1746: operation-board-widget の quick-wins + focus-blocks button にも
 * title 付与で operation-board 全 button で sighted hover disclosure 完成 (iter1734 ItemRow と
 * pair で全 truncate button cover)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/operation-board-widget.tsx 旧:
 *     - line 192-210 quick-wins button: truncate、aria-label のみで title 無し
 *     - line 228-244 focus-blocks button: truncate、aria-label のみで title 無し
 *   iter1734 で共通 ItemRow (line 482+) には title 既追加だが、quick-wins / focus-blocks の
 *   個別 button は別 component、本 iter で 2 button に title 追加で operation-board 全網羅。
 *
 * 修正 (src/components/workspace/operation-board-widget.tsx, 2 line + 7 line comment):
 *   - quick-wins button: `title={it.title}` 付与
 *   - focus-blocks button: `title={it.title}` 付与
 *   - aria-label / className / onClick / 既存属性 完全不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-operation-board-quickwins-title-iter1746.ts
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

  const opBoard = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // --- 1. quick-wins button に title={it.title} 付与済 (line 192-210 area) ---
  if (
    !opBoard.match(
      /aria-label=\{`\$\{it\.title\} を開く — 見積 \$\{it\.estimateMin\}分`\}\s*\n\s*title=\{it\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board-widget.tsx quick-wins button に title={it.title} が無い',
    })
  }

  // --- 2. focus-blocks button に title={it.title} 付与済 (line 228-244 area) ---
  if (
    !opBoard.match(
      /aria-label=\{`\$\{it\.title\} を開く — 集中 \$\{it\.estimateMin\}分`\}\s*\n\s*title=\{it\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board-widget.tsx focus-blocks button に title={it.title} が無い',
    })
  }

  // --- 3. iter1734 ItemRow 共通 button の title 維持 ---
  if (
    !opBoard.match(
      /data-testid=\{`operation-board-row-\$\{item\.id\}`\}[\s\S]{0,1500}title=\{item\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1734 operation-board-widget ItemRow title={item.title} が消えている',
    })
  }

  // --- 4. iter1745 reference invariant: sprint-risk-board assigneeLoad title 維持 ---
  const riskBoard = readFileSync(
    resolve(here, '../src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (!riskBoard.includes('title={load.name}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1745 sprint-risk-board assigneeLoad title が消えている',
    })
  }

  // --- 5. iter1744 reference invariant: tag-picker title 維持 ---
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

  // --- 6. iter1743 reference invariant: assignee-picker title 維持 ---
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

  // --- 7. iter1742 reference invariant: gantt-view 左列 title 維持 ---
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
      '(なし) — operation-board quick-wins + focus-blocks button に title 付与で全 button 網羅、iter1745-1732 invariant 不変',
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

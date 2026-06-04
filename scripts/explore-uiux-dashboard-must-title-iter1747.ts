/**
 * Phase 6.15 loop iter1747: dashboard-view の MUST item title button に title 付与で
 * sighted hover で全 title disclose (iter1720-1746 sweep を dashboard MUST list にも展開)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/dashboard-view.tsx MUST item title button (line 1488+) は
 *   truncate className を持つが title 無し、aria-label は browser tooltip にならず
 *   sighted は hover で全 title 見れず。
 *
 * 修正 (src/components/workspace/dashboard-view.tsx, 1 line + 3 line comment):
 *   <button> に `title={item.title}` 付与。aria-label / className / onClick / data-testid
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-dashboard-must-title-iter1747.ts
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

  const dashboardView = readFileSync(
    resolve(here, '../src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )

  // --- 1. dashboard-must-title button に title={item.title} 付与済 ---
  if (
    !dashboardView.match(
      /data-testid=\{`dashboard-must-title-\$\{item\.id\}`\}[\s\S]{0,1500}title=\{item\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view.tsx MUST item button に title={item.title} が無い',
    })
  }

  // --- 2. iter1149 aria-label em-dash convention 維持 ---
  if (!dashboardView.includes('aria-label={`${item.title} — MUST item を編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 3. iter1746 reference invariant: op-board quick-wins title 維持 ---
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
      '(なし) — dashboard-view MUST item title button に title 付与で sighted hover disclose、iter1746-1732 invariant 不変',
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

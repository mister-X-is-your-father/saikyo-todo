/**
 * Phase 6.15 loop iter1753: dashboard-view MUST item DoD span に title 付与で sighted hover
 * で全 dod disclose (iter1747 MUST title 補完、dashboard MUST row 全 sighted disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/dashboard-view.tsx line 1504 旧:
 *     <span className="text-muted-foreground truncate text-xs">DoD: {item.dod}</span>
 *   は DoD text を truncate で切る、aria-label / title 無、sighted は hover で全 dod 見れず
 *   (iter1747 で MUST title button に title 既追加、本 iter で同 row 内 DoD 補完)。
 *
 * 修正 (src/components/workspace/dashboard-view.tsx, 6 line 差替 + 3 line comment):
 *   <span> に `title={item.dod}` 付与。className / textContent 不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-dashboard-dod-title-iter1753.ts
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

  // --- 1. DoD span に title={item.dod} 付与済 ---
  if (
    !dashboardView.match(
      /className="text-muted-foreground truncate text-xs"\s*\n?\s*title=\{item\.dod\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view.tsx DoD span に title={item.dod} が無い',
    })
  }

  // --- 2. truncate className 維持 ---
  if (!dashboardView.includes('className="text-muted-foreground truncate text-xs"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view.tsx DoD span の truncate className が消えている',
    })
  }

  // --- 3. iter1747 reference invariant: dashboard MUST title 維持 ---
  if (
    !dashboardView.match(
      /data-testid=\{`dashboard-must-title-\$\{item\.id\}`\}[\s\S]{0,1500}title=\{item\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1747 dashboard MUST title が消えている',
    })
  }

  // --- 4. iter1752 reference invariant: quick-add preview title 維持 ---
  const quickAdd = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')
  if (!quickAdd.includes('title={preview.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1752 quick-add preview title が消えている',
    })
  }

  // --- 5. iter1751 reference invariant: subtasks/dependencies title 維持 ---
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

  // --- 6. iter1750 reference invariant: command-palette CommandItem title 維持 ---
  const cmdPalette = readFileSync(
    resolve(here, '../src/components/shared/command-palette.tsx'),
    'utf8',
  )
  if (
    !cmdPalette.match(
      /data-testid=\{`palette-item-\$\{item\.id\}`\}[\s\S]{0,1000}title=\{item\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1750 command-palette CommandItem title が消えている',
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
      '(なし) — dashboard-view DoD span に title 付与で sighted hover で dod disclose、iter1752-1732 invariant 不変',
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

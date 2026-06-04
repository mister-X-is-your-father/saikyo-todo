/**
 * Phase 6.15 loop iter1761: SeverityChip 共通 component の button + static span に title 付与
 * (iter1720-1760 title sweep の最後の主要 shared component 補完、全 caller で一括効果)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/shared/severity-chip.tsx の visible inner `<span className="truncate
 *   font-medium" aria-hidden="true">{label}</span>` で長 label 切れ、button/span (parent) は
 *   aria-label を持つが browser tooltip にならず sighted は hover で全 label 見れず。
 *   共通 chip component なので button variant (onClick あり) + static variant (onClick 無) の
 *   両方に title 付与で全 caller (8 chip family + iter1729 DashboardChip / OpBoard severity 等)
 *   で一括 disclose 効果。
 *
 * 修正 (src/components/shared/severity-chip.tsx, 2 line 追加 + 7 line comment):
 *   - button variant: <button> に `title={ariaLabel ?? label}` 付与
 *   - static variant: <span role="img"> に `title={ariaLabel ?? label}` 付与
 *   - aria-label / className / data-testid / data-severity 完全不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-severity-chip-title-iter1761.ts
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

  const severityChip = readFileSync(
    resolve(here, '../src/components/shared/severity-chip.tsx'),
    'utf8',
  )

  // --- 1. button + static span 両方に title={ariaLabel ?? label} 付与 (合計 2 件) ---
  const titleCount = (severityChip.match(/title=\{ariaLabel \?\? label\}/g) ?? []).length
  if (titleCount !== 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `severity-chip.tsx の title={ariaLabel ?? label} 件数が ${titleCount} (期待 2: button + static span)`,
    })
  }

  // --- 2. aria-label={ariaLabel ?? label} 維持 (button + span 両方、計 2 件) ---
  const ariaLabelCount = (severityChip.match(/aria-label=\{ariaLabel \?\? label\}/g) ?? []).length
  if (ariaLabelCount !== 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `severity-chip.tsx の aria-label={ariaLabel ?? label} 件数が ${ariaLabelCount} (期待 2)`,
    })
  }

  // --- 3. role="img" 維持 (static span) ---
  if (!severityChip.includes('role="img"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'severity-chip.tsx static span role="img" が消えている',
    })
  }

  // --- 4. focus-visible:ring 維持 (iter598 WCAG 2.5.5/2.5.8) ---
  if (!severityChip.includes('focus-visible:ring-ring')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'severity-chip.tsx focus-visible:ring-ring が消えている',
    })
  }

  // --- 5. iter1760 a11y-sweep-suite 健全 (集約 invariant、本 file の追加でも継続健全) ---
  //   念のため direct check で suite 内の sample invariant を verify
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

  // --- 6. iter1759 mock-submit-action 維持 ---
  const mockSubmitForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (!mockSubmitForm.includes('data-testid="mock-submit-action"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1759 mock-submit-action data-testid が消えている',
    })
  }

  // --- 7. iter1758 mock-login-seed 維持 ---
  const mockLoginForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!mockLoginForm.includes('data-testid="mock-login-seed"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1758 mock-login-seed data-testid が消えている',
    })
  }

  // --- 8. iter1732 prefers-reduced-motion helper 維持 ---
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
      '(なし) — SeverityChip 共通 component に title 付与 (button + static 両方)、全 caller で sighted hover で全 label disclose、iter1759-1732 invariant 不変',
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

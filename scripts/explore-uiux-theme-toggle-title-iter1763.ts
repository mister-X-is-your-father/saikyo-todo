/**
 * Phase 6.15 loop iter1763: theme-toggle button に title 付与で sighted hover で
 * 「ライトテーマに切替」/「ダークテーマに切替」 即把握。
 *
 * 発見した UX gap (sighted only):
 *   src/components/shared/theme-toggle.tsx は Sun / Moon icon-only button で aria-label と
 *   aria-pressed を持つが、aria-label は browser tooltip にならず sighted は hover 時に
 *   何をする button か即把握できなかった (icon だけで意味推測必要)。title 付与で aria-label
 *   と同 text の disclosure で SR ↔ sighted の体験同期。
 *
 * 修正 (src/components/shared/theme-toggle.tsx, 4 line 追加 + 4 line comment):
 *   <Button> に conditional `title={resolvedTheme === 'dark' ? 'ライトテーマに切替' : 'ダークテーマに切替'}`
 *   付与。aria-label / aria-pressed / className / data-testid 完全不変、shadcn 編集なし、
 *   機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-theme-toggle-title-iter1763.ts
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

  const themeToggle = readFileSync(
    resolve(here, '../src/components/shared/theme-toggle.tsx'),
    'utf8',
  )

  // --- 1. title (conditional) 付与済 ---
  if (
    !themeToggle.match(
      /title=\{\s*\n?\s*resolvedTheme === 'dark' \? 'ライトテーマに切替' : 'ダークテーマに切替'\s*\n?\s*\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle.tsx に conditional title が無い',
    })
  }

  // --- 2. iter1603 aria-label em-dash 維持 ---
  if (
    !themeToggle.includes("'ライトテーマ — クリックで切替'") ||
    !themeToggle.includes("'ダークテーマ — クリックで切替'")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 3. aria-pressed 維持 (toggle state) ---
  if (!themeToggle.includes("aria-pressed={resolvedTheme === 'dark'}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle.tsx aria-pressed が消えている',
    })
  }

  // --- 4. data-testid="theme-toggle" 維持 ---
  if (!themeToggle.includes('data-testid="theme-toggle"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle.tsx data-testid が消えている',
    })
  }

  // --- 5. min-h-11 min-w-11 (44x44 tap target) 維持 ---
  if (!themeToggle.includes('className="min-h-11 min-w-11"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle.tsx min-h-11 min-w-11 (44x44) が消えている',
    })
  }

  // --- 6. iter1761 SeverityChip title 維持 ---
  const severityChip = readFileSync(
    resolve(here, '../src/components/shared/severity-chip.tsx'),
    'utf8',
  )
  const severityTitleCount = (severityChip.match(/title=\{ariaLabel \?\? label\}/g) ?? []).length
  if (severityTitleCount !== 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1761 SeverityChip title 件数が ${severityTitleCount} (期待 2)`,
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
      '(なし) — theme-toggle に conditional title 付与で sighted hover で切替先 disclose、iter1761-1732 invariant 不変',
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

/**
 * Phase 6.15 loop iter1767: AsyncStates ErrorState retry button に title 付与 (共通 component
 * 1 修正で全 caller の retry UX 一括改善、icon-only button family の error state 拡張)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/shared/async-states.tsx ErrorState の retry Button (line 100+) は
 *   aria-label を持つが browser tooltip にならず sighted は hover でエラー再試行の context
 *   (どの error をクリアするか) を即把握できなかった。
 *
 * 修正 (src/components/shared/async-states.tsx, 1 line + 4 line comment):
 *   <Button> に `title={同 aria-label}` 付与。aria-label / className / onClick 完全不変、
 *   shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-error-retry-title-iter1767.ts
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

  const asyncStates = readFileSync(
    resolve(here, '../src/components/shared/async-states.tsx'),
    'utf8',
  )

  // --- 1. ErrorState retry button に title 付与済 ---
  if (!asyncStates.includes('title={`再試行 — 「${message}」をクリアして再試行`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'async-states.tsx ErrorState retry button に title が無い',
    })
  }

  // --- 2. iter1151 aria-label em-dash convention 維持 ---
  if (!asyncStates.includes('aria-label={`再試行 — 「${message}」をクリアして再試行`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'async-states.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 3. role="alert" 維持 (ErrorState) ---
  if (!asyncStates.includes('role="alert"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'async-states.tsx ErrorState role="alert" が消えている',
    })
  }

  // --- 4. role="status" 維持 (Loading + EmptyState) ---
  const statusCount = (asyncStates.match(/role="status"/g) ?? []).length
  if (statusCount < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `async-states.tsx role="status" 件数が ${statusCount} (期待 >= 2: Loading + EmptyState)`,
    })
  }

  // --- 5. iter1765 calendar-view nav title 維持 ---
  const calendarView = readFileSync(
    resolve(here, '../src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    !calendarView.includes("title={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1765 calendar-view prev title が消えている',
    })
  }

  // --- 6. iter1764 notification-bell title 維持 ---
  const notifBell = readFileSync(
    resolve(here, '../src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (!notifBell.includes('title={`通知 — 未読 ${unreadCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1764 notification-bell title が消えている',
    })
  }

  // --- 7. iter1763 theme-toggle title 維持 ---
  const themeToggle = readFileSync(
    resolve(here, '../src/components/shared/theme-toggle.tsx'),
    'utf8',
  )
  if (
    !themeToggle.match(
      /title=\{\s*\n?\s*resolvedTheme === 'dark' \? 'ライトテーマに切替' : 'ダークテーマに切替'\s*\n?\s*\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1763 theme-toggle conditional title が消えている',
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
      '(なし) — async-states ErrorState retry button に title 付与で全 caller の retry UX 一括改善、iter1765-1732 invariant 不変',
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

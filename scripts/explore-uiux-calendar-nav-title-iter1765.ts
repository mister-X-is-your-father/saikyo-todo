/**
 * Phase 6.15 loop iter1765: calendar-view 前日/翌日 navigation icon-only button に title 付与
 * (iter1763 theme-toggle / iter1764 notification icon-only sweep の calendar 展開、
 * icon-only button family の sighted hover disclosure 完備)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/schedule/calendar-view.tsx の prev/next button (line 170-179 / 183-192) は
 *   ChevronLeft / ChevronRight icon-only で aria-label を持つが browser tooltip にならず
 *   sighted は hover で「前日」/「翌日」 即把握できなかった。
 *
 * 修正 (src/components/schedule/calendar-view.tsx, 2 line 追加 + 4 line comment):
 *   - prev button: `title={同 aria-label}` 付与
 *   - next button: `title={同 aria-label}` 付与
 *   - aria-label / className / data-testid / onClick 完全不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-calendar-nav-title-iter1765.ts
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

  const calendarView = readFileSync(
    resolve(here, '../src/components/schedule/calendar-view.tsx'),
    'utf8',
  )

  // --- 1. prev button に title 付与済 ---
  if (
    !calendarView.includes("title={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view.tsx prev button に title が無い',
    })
  }

  // --- 2. next button に title 付与済 ---
  if (
    !calendarView.includes("title={`翌日 — ${format(addDays(date, 1), 'M月d日 (eee)')} を表示`}")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view.tsx next button に title が無い',
    })
  }

  // --- 3. aria-label em-dash convention 維持 (両 button) ---
  if (
    !calendarView.includes(
      "aria-label={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}",
    ) ||
    !calendarView.includes(
      "aria-label={`翌日 — ${format(addDays(date, 1), 'M月d日 (eee)')} を表示`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 4. data-testid="calendar-prev-btn" / calendar-next-btn 維持 ---
  if (
    !calendarView.includes('data-testid="calendar-prev-btn"') ||
    !calendarView.includes('data-testid="calendar-next-btn"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view.tsx data-testid のいずれかが消えている',
    })
  }

  // --- 5. iter1764 notification-bell title 維持 ---
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

  // --- 6. iter1763 theme-toggle title 維持 ---
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

  // --- 7. iter1761 SeverityChip title 維持 ---
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
      '(なし) — calendar-view 前日/翌日 icon-only button に title 付与で sighted hover disclosure、icon-only button family 完備、iter1764-1732 invariant 不変',
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

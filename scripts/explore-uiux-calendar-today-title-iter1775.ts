/**
 * Phase 6.15 loop iter1775: calendar-view 今日 button にも title 付与
 * (iter1765 prev/next と同 pattern を today にも展開、calendar nav 3 button family
 * (前日 / 今日 / 翌日) の hover disclosure 完備)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/schedule/calendar-view.tsx line 199-211 の "今日" button は
 *   visible text "今日" のみで sighted hover で target 日付 (今日 M月d日 (eee))
 *   見えず、aria-label は browser tooltip にならない。iter1765 prev/next button は
 *   title 付与済だが today button は漏れ。
 *
 * 修正 (src/components/schedule/calendar-view.tsx, 4 line 追加 + 3 line comment):
 *   <Button> に `title={同 aria-label}` 付与。aria-label / className / onClick /
 *   data-testid 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-calendar-today-title-iter1775.ts
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

  // --- 1. 今日 button に title 付与済 ---
  if (
    !calendarView.includes(
      "title={`今日 — 表示日を今日 (${format(new Date(), 'M月d日 (eee)')}) にリセット`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view.tsx 今日 button に title が無い',
    })
  }

  // --- 2. iter1146 em-dash aria-label 維持 ---
  if (
    !calendarView.includes(
      "aria-label={`今日 — 表示日を今日 (${format(new Date(), 'M月d日 (eee)')}) にリセット`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1146 calendar-view 今日 button em-dash aria-label が消えている',
    })
  }

  // --- 3. iter1765 prev/next title 維持 (3 button family 完備) ---
  if (
    !calendarView.includes("title={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}") ||
    !calendarView.includes("title={`翌日 — ${format(addDays(date, 1), 'M月d日 (eee)')} を表示`}")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1765 calendar-view prev/next title が消えている',
    })
  }

  // --- 4. calendar-today-btn data-testid 維持 ---
  if (!calendarView.includes('data-testid="calendar-today-btn"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-today-btn data-testid が消えている',
    })
  }

  // --- 5. iter1773 timeline-lane EventBlock title 維持 ---
  const timeline = readFileSync(
    resolve(here, '../src/components/schedule/timeline-lane.tsx'),
    'utf8',
  )
  if (!timeline.includes('title={fullLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1773 timeline-lane EventBlock title が消えている',
    })
  }

  // --- 6. iter1771 schedule-item-picker title 維持 ---
  const picker = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (!picker.includes('title={it.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1771 schedule-item-picker title が消えている',
    })
  }

  // --- 7. iter1769 workflows-panel description title 維持 ---
  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (!wfPanel.includes('title={wf.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1769 workflows-panel description title が消えている',
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
      '(なし) — calendar-view 今日 button に title 付与で nav 3 button family hover disclosure 完備、iter1773-1732 invariant 不変',
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

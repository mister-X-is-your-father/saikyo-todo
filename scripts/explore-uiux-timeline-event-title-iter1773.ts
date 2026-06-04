/**
 * Phase 6.15 loop iter1773: timeline-lane EventBlock の inner div に title 付与
 * (iter1769 workflows-panel / iter1771 schedule-item-picker と同 truncate + title
 * pattern を react-big-calendar event block にも展開、line-clamp + title sweep の
 * timeline 補完)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/schedule/timeline-lane.tsx line 68-77 EventBlock:
 *     <div className="flex h-full flex-col overflow-hidden text-[11px] leading-tight">
 *       <div className="truncate font-medium">{event.title}</div>
 *       <div className="truncate opacity-70">{HH:mm – HH:mm}</div>
 *     </div>
 *   は title 行が truncate で長 event.title 切れ、react-big-calendar wrapper の
 *   accessible name 経路 (tab/select) のみで sighted は hover で全 title 見れず。
 *
 * 修正 (src/components/schedule/timeline-lane.tsx, 7 line 追加 + 5 line comment):
 *   親 div に `title={fullLabel}` 付与 (event.title + 時刻)。className / textContent
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-timeline-event-title-iter1773.ts
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

  const timeline = readFileSync(
    resolve(here, '../src/components/schedule/timeline-lane.tsx'),
    'utf8',
  )

  // --- 1. EventBlock 親 div に title 付与済 ---
  if (!timeline.includes('title={fullLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'timeline-lane.tsx EventBlock div に title={fullLabel} が無い',
    })
  }

  // --- 2. fullLabel 構築 (event.title + 時刻) ---
  if (
    !timeline.includes(
      "`${event.title} — ${format(event.start, 'HH:mm')}–${format(event.end, 'HH:mm')}`",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'timeline-lane.tsx fullLabel 構築 (event.title + 時刻) が無い',
    })
  }

  // --- 3. truncate 維持 (title + time 両行) ---
  const truncateCount = (timeline.match(/className="truncate/g) ?? []).length
  if (truncateCount < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `timeline-lane.tsx truncate 件数が ${truncateCount} (期待 >= 2: title + time)`,
    })
  }

  // --- 4. iter1771 schedule-item-picker title 維持 ---
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

  // --- 5. iter1769 workflows-panel description title 維持 ---
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

  // --- 6. iter1767 ErrorState retry title 維持 ---
  const asyncStates = readFileSync(
    resolve(here, '../src/components/shared/async-states.tsx'),
    'utf8',
  )
  if (!asyncStates.includes('title={`再試行 — 「${message}」をクリアして再試行`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1767 ErrorState retry title が消えている',
    })
  }

  // --- 7. iter1765 calendar-view nav title 維持 ---
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
      '(なし) — timeline-lane EventBlock div に title 付与で sighted hover で event.title + 時刻 disclose、iter1771-1732 invariant 不変',
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

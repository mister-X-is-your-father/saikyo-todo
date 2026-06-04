/**
 * Phase 6.15 loop iter1771: schedule-item-picker の filtered list button に title 付与
 * (iter1740 workflows-panel CardTitle / iter1769 workflows description と同
 * truncate + title pattern を picker button にも展開、line-clamp + title sweep の
 * picker 補完)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/schedule/schedule-item-picker.tsx line 89-103 の button:
 *     <button aria-label={`${it.title} — item を選択...`}>
 *       <span className="truncate" aria-hidden="true">{it.title}</span>
 *       ...
 *     </button>
 *   は inner span が truncate + aria-hidden、aria-label は browser tooltip にならず
 *   sighted は hover で長 title 全体即把握できず。
 *
 * 修正 (src/components/schedule/schedule-item-picker.tsx, 5 line 追加 + 4 line comment):
 *   <button> に `title={it.title}` 付与。aria-label / className / onClick 完全不変、
 *   shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-schedule-picker-title-iter1771.ts
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

  const picker = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )

  // --- 1. picker button に title={it.title} 付与済 ---
  if (!picker.includes('title={it.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-item-picker.tsx button に title={it.title} が無い',
    })
  }

  // --- 2. iter1147 aria-label em-dash convention 維持 ---
  if (!picker.includes("aria-label={`${it.title} — item を選択${it.isMust ? ' (MUST)' : ''}`}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1147 schedule-item-picker em-dash aria-label が消えている',
    })
  }

  // --- 3. inner span truncate + aria-hidden 維持 ---
  if (!picker.includes('<span className="truncate" aria-hidden="true">')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-item-picker inner span truncate aria-hidden が消えている',
    })
  }

  // --- 4. data-testid="schedule-picker-list" 維持 ---
  if (!picker.includes('data-testid="schedule-picker-list"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-item-picker data-testid="schedule-picker-list" が消えている',
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
      '(なし) — schedule-item-picker button に title={it.title} 付与で sighted hover で全 title disclose、iter1769-1732 invariant 不変',
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

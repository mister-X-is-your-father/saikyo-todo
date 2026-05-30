/**
 * Phase 6.15 loop iter1496: calendar-view.tsx 前日 / 翌日 button aria-label を em-dash 統一
 * (regression guard、iter588 の paren format からの migration)。
 *
 * iter588 で nav button aria-label に target 日付を埋め込んだが旧 () 区切。iter1093-1494
 * em-dash sweep で codebase 全体の visible-prefix button aria-label を em-dash 区切に統一
 * 済だが calendar-view nav は 2 button が () のまま残存していた (同 row の 「今日」 button は
 * iter1146 で既に em-dash 化済 で divergence)。
 *
 * 修正 (calendar-view.tsx):
 *   prev button:
 *     aria-label={`前日 (${format(subDays(date, 1), 'M月d日 (eee)')}) を表示`}
 *   → aria-label={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}
 *
 *   next button:
 *     aria-label={`翌日 (${format(addDays(date, 1), 'M月d日 (eee)')}) を表示`}
 *   → aria-label={`翌日 — ${format(addDays(date, 1), 'M月d日 (eee)')} を表示`}
 *
 * 連動更新 (scripts/explore-uiux-calendar-nav-aria-iter588.ts):
 *   prev / next button の regex 形式を () → em-dash に migration。
 *
 * 注: visible content は icon のみ (ChevronLeft/Right、aria-hidden) で accessible name は
 * aria-label の値。voice control「click 前日」 / 「click 翌日」 は prefix match 維持。
 * 同 row の `role="group"` landmark aria-label (`カレンダー日付ナビゲーション (現在: ..., 前日 / 翌日 / 今日)`)
 * は landmark vocab convention で paren 維持。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-calendar-nav-em-dash-iter1496.ts
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
  const filePath = resolve(here, '../src/components/schedule/calendar-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 1. prev button em-dash 新形式
  if (!src.includes("aria-label={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view prev button aria-label が em-dash 形式 "前日 — ${...}" でない',
    })
  }
  // 1b. 旧 () 残存
  if (src.includes("aria-label={`前日 (${format(subDays(date, 1), 'M月d日 (eee)')}) を表示`}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view prev button 旧 () 区切 aria-label が残存',
    })
  }

  // 2. next button em-dash 新形式
  if (!src.includes("aria-label={`翌日 — ${format(addDays(date, 1), 'M月d日 (eee)')} を表示`}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view next button aria-label が em-dash 形式 "翌日 — ${...}" でない',
    })
  }
  // 2b. 旧 () 残存
  if (src.includes("aria-label={`翌日 (${format(addDays(date, 1), 'M月d日 (eee)')}) を表示`}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view next button 旧 () 区切 aria-label が残存',
    })
  }

  // 3. iter1146 today button em-dash 維持 (regression invariant)
  if (
    !src.includes(
      "aria-label={`今日 — 表示日を今日 (${format(new Date(), 'M月d日 (eee)')}) にリセット`}",
    )
  ) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'iter1146 invariant: calendar-view today button em-dash aria-label が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — calendar-view prev/next button aria-label が em-dash convention 統一済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

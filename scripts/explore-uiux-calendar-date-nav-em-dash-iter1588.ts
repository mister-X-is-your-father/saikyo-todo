/**
 * Phase 6.15 loop iter1588: schedule/calendar-view カレンダー日付ナビゲーション group landmark
 * aria-label paren を em-dash 区切に migration (iter1093-1587 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"カレンダー日付ナビゲーション (現在: X、前日 / 翌日 / 今日)"` は
 * iter1093-1587 sweep の em-dash 区切と divergent。区切のみ '(現在:' → ' — 現在' に統一、closing ')' は削除。
 *
 * 修正 (calendar-view.tsx):
 *   `カレンダー日付ナビゲーション (現在: X、前日 / 翌日 / 今日)`
 *   → `カレンダー日付ナビゲーション — 現在 X、前日 / 翌日 / 今日`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-calendar-date-nav-em-dash-iter1588.ts
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
  const src = readFileSync(resolve(here, '../src/components/schedule/calendar-view.tsx'), 'utf8')

  if (!src.includes('aria-label={`カレンダー日付ナビゲーション — 現在 ${format(date,')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view 日付ナビゲーション group aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`カレンダー日付ナビゲーション (現在: ${format(date,')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-view 日付ナビゲーション group 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — calendar-view 日付ナビゲーション group aria-label が em-dash 区切')
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

/**
 * Phase 6.15 loop iter 421 (mode-D Desktop a11y) — CalendarView 日付
 * navigation の icon-only button + 日付 heading + Loader2 の 4 件 a11y を
 * 修正、codify。
 *
 * 課題: src/components/schedule/calendar-view.tsx (252 行) の日付ナビ:
 *   1. `<Button size="icon">` + `<ChevronLeft />` の前日 button が
 *      `aria-label` 不在 → SR は「button」のみ、用途不明 (WCAG 2.5.3
 *      label-in-name 違反)
 *   2. 同 ChevronRight 翌日 button も aria-label 不在
 *   3. 日付表示が `<div>` で `<h2>` 等 heading semantic 不在 → SR で
 *      landmark / heading navigation で日付に直行できない
 *   4. mutation pending 中 `<Loader2>` icon が回るだけで `role="status"` /
 *      `aria-label` 不在 → SR ユーザに「保存中」が伝わらず操作タイミング不明
 *
 * fix: 1 ファイル ~10 行差分。
 *   - 前日 button に `aria-label="前日"` + ChevronLeft icon を `aria-hidden`
 *   - 翌日 button に `aria-label="翌日"` + ChevronRight icon を `aria-hidden`
 *   - 日付表示 `<div>` を `<h2>` に変更 + `aria-live="polite"` + `aria-atomic="true"`
 *     で日付変更時 SR 自動 announce
 *   - Loader2 に `role="status"` + `aria-label="保存中"` で SR pending announce
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (Calendar 描画) は
 *   workspace + schedule seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/schedule/calendar-view.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. 前日 button aria-label
  if (/aria-label="前日"[\s\S]{0,200}?<ChevronLeft[^>]*aria-hidden="true"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: 前日 button aria-label + ChevronLeft aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 前日 button aria-label または ChevronLeft aria-hidden 不在`,
    })
  }

  // 2. 翌日 button aria-label
  if (/aria-label="翌日"[\s\S]{0,200}?<ChevronRight[^>]*aria-hidden="true"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: 翌日 button aria-label + ChevronRight aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 翌日 button aria-label または ChevronRight aria-hidden 不在`,
    })
  }

  // 3. 日付 heading 化 (h2 + aria-live + aria-atomic)
  if (/<h2\s+aria-live="polite"\s+aria-atomic="true"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: 日付 h2 + aria-live + aria-atomic OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 日付 h2 / aria-live / aria-atomic 不在`,
    })
  }

  // 4. Loader2 role + aria-label
  if (/<Loader2[\s\S]{0,200}?aria-label="保存中"[\s\S]{0,80}?role="status"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: Loader2 role="status" + aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Loader2 role/aria-label 不在` })
  }

  console.log(`\n=== Findings (calendar-date-nav-iter421) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

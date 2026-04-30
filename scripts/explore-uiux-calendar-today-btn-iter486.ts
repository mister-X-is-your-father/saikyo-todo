/**
 * Phase 6.15 loop iter 486 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * CalendarView header の「今日」 button に min-h-11 + aria-label + data-testid 追加、codify。
 *
 * 課題: src/components/schedule/calendar-view.tsx 行 183-185 の Button が
 *   `<Button variant="ghost" size="sm" onClick=...>今日</Button>` で:
 *   1. `className="min-h-11"` 漏れ → h-8 = 32px (mobile WCAG 2.5.5 AAA 44x44 違反)
 *   2. `aria-label` 不在 → SR は visible "今日" のみ読み上げ、機能 (= 表示日リセット) が
 *      文脈から推測必要 (前日 / 翌日 button は aria-label="前日" / "翌日" で明示済、
 *      今日 button だけ漏れ)
 *   3. `data-testid` 不在 → Playwright runtime test で identify 不可
 *
 *   両端の前日 / 翌日 icon button は size="icon" + aria-label="前日" / "翌日" を持つが
 *   今日 button はその grouping から外れた non-uniform polish になっていた。
 *
 * fix (1 ファイル ~6 行差分):
 *   - `className="min-h-11"` 追加 (44x44 達成)
 *   - `aria-label="表示日を今日にリセット"` (機能を SR に明示)
 *   - `data-testid="calendar-today-btn"` (test 識別)
 *
 * 累計 **108 button mobile target 達成** (iter460-486 で 23 fix iter)。
 * 機能追加なし、shadcn 編集なし。
 *
 * 検証: source-side regex assert + 兄弟 button (前日 / 翌日) 整合性 cross-check。
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

  // 1. 今日 Button に min-h-11 + size=sm 配線
  if (
    /<Button[\s\S]{0,200}?variant="ghost"[\s\S]{0,200}?size="sm"[\s\S]{0,200}?className="min-h-11"[\s\S]{0,200}?onClick=\{\(\) => setDate\(startOfDay\(new Date\(\)\)\)\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: 今日 Button min-h-11 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 今日 Button min-h-11 配線 不在` })
  }

  // 2. aria-label="表示日を今日にリセット" 配線
  if (/aria-label="表示日を今日にリセット"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 今日 Button aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 今日 Button aria-label 不在` })
  }

  // 3. data-testid="calendar-today-btn" 配線
  if (/data-testid="calendar-today-btn"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 今日 Button data-testid OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 今日 Button data-testid 不在` })
  }

  // 4. 前日 / 翌日 button の aria-label 整合性 (regression、grouping 維持)
  if (/aria-label="前日"/.test(src) && /aria-label="翌日"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 前日 / 翌日 button aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 前日 / 翌日 button aria-label 破壊` })
  }

  // 5. 旧 aria-label 無し plain "今日" Button が消えている
  if (
    !/<Button variant="ghost" size="sm" onClick=\{\(\) => setDate\(startOfDay\(new Date\(\)\)\)\}>\s*\n?\s*今日/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: 旧 plain 今日 Button が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 plain 今日 Button が残存` })
  }

  // 6. Calendar h2 header aria-live="polite" + aria-atomic 維持 (regression)
  if (/<h2 aria-live="polite" aria-atomic="true" className="text-base font-semibold">/.test(src)) {
    findings.push({ level: 'info', message: `${path}: Calendar h2 aria-live 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Calendar h2 aria-live 破壊` })
  }

  console.log(`\n=== Findings (calendar-today-btn-iter486) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

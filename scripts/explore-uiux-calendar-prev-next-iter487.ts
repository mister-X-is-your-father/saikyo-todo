/**
 * Phase 6.15 loop iter 487 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * CalendarView header の 前日 / 翌日 icon button (size="icon") に min-h-11 + min-w-11 + data-testid 追加、codify。
 *
 * 課題: src/components/schedule/calendar-view.tsx 行 164-181 の icon button 2 件 が
 *   `size="icon"` のみで `className="min-h-11 min-w-11"` 漏れ → shadcn `size="icon"` は
 *   `size-9` (= 36x36 px) で WCAG 2.5.5 AAA 44x44 違反。
 *
 *   workspace utility icon button (theme-toggle / notification-bell / notification-preferences) は
 *   全て iter462 で `min-h-11 min-w-11` 追加済だが、CalendarView header の 2 個は漏れ。
 *
 *   iter486 で 同 header の 「今日」 sm button は min-h-11 + aria-label + data-testid 追加済。
 *   本 iter で 残 2 件の icon button (前日 / 翌日) を sweep し、CalendarView header 3 button
 *   (前日 / 今日 / 翌日) が 44x44 で完全統一。
 *
 * fix (1 ファイル ~6 行差分):
 *   - 前日 button: `className="min-h-11 min-w-11"` + `data-testid="calendar-prev-btn"` 追加
 *   - 翌日 button: `className="min-h-11 min-w-11"` + `data-testid="calendar-next-btn"` 追加
 *   - 既存 aria-label="前日" / "翌日" は維持
 *
 * 累計 **110 button mobile target 達成** (iter460-487 で 24 fix iter、+2 件)。
 * 機能追加なし、shadcn 編集なし、視覚 layout は 36x36 → 44x44 で 8px ずつ広がるが
 * row 全体が左右に 16px 程度広がるだけで影響は localised (workspace utility と同 pattern)。
 *
 * 検証: source-side regex assert + 兄弟 icon button (theme-toggle / notification-bell / notification-preferences)
 * 整合性 cross-check。
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

  // 1. 前日 Button に min-h-11 min-w-11 + data-testid 配線
  if (
    /<Button[\s\S]{0,200}?size="icon"[\s\S]{0,200}?className="min-h-11 min-w-11"[\s\S]{0,200}?aria-label="前日"[\s\S]{0,200}?data-testid="calendar-prev-btn"/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: 前日 Button min-h-11 + min-w-11 + data-testid OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 前日 Button min-h-11 + min-w-11 + data-testid 不在`,
    })
  }

  // 2. 翌日 Button に min-h-11 min-w-11 + data-testid 配線
  if (
    /<Button[\s\S]{0,200}?size="icon"[\s\S]{0,200}?className="min-h-11 min-w-11"[\s\S]{0,200}?aria-label="翌日"[\s\S]{0,200}?data-testid="calendar-next-btn"/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: 翌日 Button min-h-11 + min-w-11 + data-testid OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 翌日 Button min-h-11 + min-w-11 + data-testid 不在`,
    })
  }

  // 3. iter486 invariant: 今日 button min-h-11 + aria-label="表示日を今日にリセット" + data-testid 維持
  if (
    /className="min-h-11"[\s\S]{0,200}?aria-label="表示日を今日にリセット"[\s\S]{0,200}?data-testid="calendar-today-btn"/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: iter486 (今日 button) invariant 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter486 invariant 破壊` })
  }

  // 4. ChevronLeft / ChevronRight icon は aria-hidden 維持 (regression)
  if (
    /<ChevronLeft className="h-4 w-4" aria-hidden="true" \/>/.test(src) &&
    /<ChevronRight className="h-4 w-4" aria-hidden="true" \/>/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: chevron icon aria-hidden 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: chevron icon aria-hidden 破壊` })
  }

  // 5. 兄弟 icon button (theme-toggle / notification-bell / notification-preferences) の整合性
  const sibPaths = [
    { path: 'src/components/shared/theme-toggle.tsx', name: 'theme-toggle' },
    { path: 'src/components/workspace/notification-bell.tsx', name: 'notification-bell' },
    {
      path: 'src/components/workspace/notification-preferences.tsx',
      name: 'notification-preferences',
    },
  ]
  for (const sib of sibPaths) {
    const sibSrc = readFileSync(resolve(process.cwd(), sib.path), 'utf8')
    if (
      /size="icon"[\s\S]{0,300}?className="[^"]*min-h-11[^"]*min-w-11/.test(sibSrc) ||
      /size="icon"[\s\S]{0,300}?className="[^"]*min-w-11[^"]*min-h-11/.test(sibSrc) ||
      /size="icon"[\s\S]{0,300}?className="min-h-11 min-w-11"/.test(sibSrc) ||
      /size="icon"[\s\S]{0,300}?className="relative min-h-11 min-w-11"/.test(sibSrc)
    ) {
      findings.push({
        level: 'info',
        message: `${sib.path}: ${sib.name} icon min-h-11 + min-w-11 維持 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${sib.path}: ${sib.name} icon min-h-11 + min-w-11 破壊`,
      })
    }
  }

  console.log(`\n=== Findings (calendar-prev-next-iter487) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

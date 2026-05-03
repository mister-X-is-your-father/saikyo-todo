/**
 * Phase 6.15 loop iter 688 (mode-D Desktop a11y) —
 * items-board view-switcher の 日次 / 週次 / 月次 button に descriptive aria-label 追加
 * (個人 期 review 画面の context expose)。
 *
 * 課題: items-board.tsx 行 267-296 の `view-daily-btn` / `view-weekly-btn` / `view-monthly-btn` は
 *   visible text "日次" / "週次" / "月次" だけで aria-label 無し。SR ユーザは「日次, button」
 *   とだけ announce されてどんな画面に遷移するか分からない。Today/Inbox/Kanban/Backlog/Gantt/Dashboard
 *   は英語名で意味自明だが、日次/週次/月次 は短縮日本語で曖昧。実体は PersonalPeriodView (個人 期間
 *   review) なので明示的に context を expose したい。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 日次: `aria-label="日次レビュー画面 (個人 期間 = 今日)"`
 *   - 週次: `aria-label="週次レビュー画面 (個人 期間 = 今週)"`
 *   - 月次: `aria-label="月次レビュー画面 (個人 期間 = 今月)"`
 *
 * 検証: source-side regex assert + iter515-687 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )

  // 1. 日次 aria-label
  if (/aria-label="日次レビュー画面 \(個人 期間 = 今日\)"/.test(ib)) {
    findings.push({ level: 'info', message: `view-daily aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `view-daily aria-label なし` })
  }

  // 2. 週次 aria-label
  if (/aria-label="週次レビュー画面 \(個人 期間 = 今週\)"/.test(ib)) {
    findings.push({ level: 'info', message: `view-weekly aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `view-weekly aria-label なし` })
  }

  // 3. 月次 aria-label
  if (/aria-label="月次レビュー画面 \(個人 期間 = 今月\)"/.test(ib)) {
    findings.push({ level: 'info', message: `view-monthly aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `view-monthly aria-label なし` })
  }

  // 4. iter687 invariant: app/page.tsx logout form aria-label 維持
  const ap = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/<form\s*\n\s*aria-label="ログアウト"\s*\n\s*action=\{async/.test(ap)) {
    findings.push({ level: 'info', message: `iter687 invariant: logout form aria 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter687 invariant: 破壊` })
  }

  // 5. iter662 invariant: items-board filter group 維持 (= items-board 同 file)
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  // 6. iter686 invariant: app/page.tsx main id=main-content 維持
  if (/<main id="main-content" className="container mx-auto max-w-3xl space-y-8 p-6">/.test(ap)) {
    findings.push({ level: 'info', message: `iter686 invariant: main id 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter686 invariant: 破壊` })
  }

  console.log(`\n=== Findings (period-view-aria-iter688) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

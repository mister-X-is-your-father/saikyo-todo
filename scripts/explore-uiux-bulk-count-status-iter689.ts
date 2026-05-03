/**
 * Phase 6.15 loop iter 689 (mode-D Desktop a11y) —
 * bulk-action-bar bulk-count span に role=status + aria-live=polite + aria-atomic 追加
 * (count 変動を SR active 通知)。
 *
 * 課題: bulk-action-bar.tsx 行 74-76 の bulk-count span は parent region の
 *   aria-label に count が含まれるが、count 変動時に多くの SR は静的 aria-label の
 *   変化を再 announce しない。span 単体に aria-live が無いと「N 件選択中 → N+1 件選択中」
 *   の変化が SR ユーザに伝わらない。
 *
 * fix (1 ファイル ~6 行差分):
 *   - span に `role="status"` + `aria-live="polite"` + `aria-atomic="true"` 追加
 *   - 多選択 → 解除した時の count 変化が active 通知される
 *
 * iter682 (notification-bell labelledby) と同 a11y axis (live region 整備)。
 *
 * 検証: source-side regex assert + iter515-688 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )

  // 1. bulk-count に role=status + aria-live + aria-atomic
  if (
    /<span\s*\n\s*className="text-sm font-medium"\s*\n\s*role="status"\s*\n\s*aria-live="polite"\s*\n\s*aria-atomic="true"\s*\n\s*data-testid="bulk-count"/.test(
      bb,
    )
  ) {
    findings.push({ level: 'info', message: `bulk-count role=status + aria-live + aria-atomic OK` })
  } else {
    findings.push({ level: 'warning', message: `bulk-count aria not added` })
  }

  // 2. parent region invariant 維持 (= aria-label が壊れていない)
  if (/role="region"\s*\n\s*aria-label=\{`一括操作 \(\$\{count\} 件選択中\)`\}/.test(bb)) {
    findings.push({ level: 'info', message: `parent region aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `parent region aria-label 破壊` })
  }

  // 3. iter688 invariant: 日次/週次/月次 aria 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/aria-label="日次レビュー画面 \(個人 期間 = 今日\)"/.test(ib)) {
    findings.push({ level: 'info', message: `iter688 invariant: 日次 aria 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter688 invariant: 破壊` })
  }

  // 4. iter687 invariant: app/page.tsx logout form aria 維持
  const ap = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/<form\s*\n\s*aria-label="ログアウト"\s*\n\s*action=\{async/.test(ap)) {
    findings.push({ level: 'info', message: `iter687 invariant: logout form 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter687 invariant: 破壊` })
  }

  // 5. iter686 invariant: app main id 維持
  if (/<main id="main-content" className="container mx-auto max-w-3xl space-y-8 p-6">/.test(ap)) {
    findings.push({ level: 'info', message: `iter686 invariant: main id 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter686 invariant: 破壊` })
  }

  console.log(`\n=== Findings (bulk-count-status-iter689) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

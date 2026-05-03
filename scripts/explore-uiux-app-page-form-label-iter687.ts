/**
 * Phase 6.15 loop iter 687 (mode-D Desktop a11y) —
 * src/app/page.tsx (Workspace 一覧 root) のログアウト `<form>` に aria-label 追加
 * (form landmark 名付け、SR の form navigation で識別可能化)。
 *
 * 課題: app/page.tsx 行 28 の `<form action={...}>` (ログアウト送信用) は aria-label なし。
 *   form landmark は SR の F (or D) navigation key で nav できるが、名前なしだと
 *   「フォーム」とだけ announce されて何の form か分からない。Inner Button は aria-label 持つが
 *   form 単位では nameless。mock-timesheet の logout form (mock-top-nav.tsx) と同じく
 *   `aria-label="ログアウト"` を付与すべき。
 *
 * fix (1 ファイル ~1 行差分):
 *   - `<form>` に `aria-label="ログアウト"`
 *
 * 検証: source-side regex assert + iter515-686 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ap = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')

  // 1. logout form に aria-label
  if (/<form\s*\n\s*aria-label="ログアウト"\s*\n\s*action=\{async/.test(ap)) {
    findings.push({ level: 'info', message: `app/page.tsx logout form aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `app/page.tsx logout form aria-label なし` })
  }

  // 2. iter686 invariant: main id=main-content 維持
  if (/<main id="main-content" className="container mx-auto max-w-3xl space-y-8 p-6">/.test(ap)) {
    findings.push({ level: 'info', message: `iter686 invariant: main id=main-content 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter686 invariant: 破壊` })
  }

  // 3. iter679 invariant: workspace-link 維持
  if (
    /hover:bg-muted focus-visible:ring-ring block rounded-lg border p-4 transition focus-visible:ring-2 focus-visible:outline-none/.test(
      ap,
    )
  ) {
    findings.push({ level: 'info', message: `iter679 invariant: workspace-link 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter679 invariant: 破壊` })
  }

  // 4. mock-timesheet logout form aria-label 既存維持 (= 同 pattern を統一適用)
  const mtn = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (/aria-label="mock-timesheet からログアウト"/.test(mtn)) {
    findings.push({ level: 'info', message: `mock-timesheet logout form 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `mock-timesheet logout form 破壊` })
  }

  // 5. iter685 invariant: summary focus-visible 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    /text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1\.5 rounded text-xs focus-visible:ring-2 focus-visible:outline-none/.test(
      ssd,
    )
  ) {
    findings.push({ level: 'info', message: `iter685 invariant: summary 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter685 invariant: 破壊` })
  }

  console.log(`\n=== Findings (app-page-form-label-iter687) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

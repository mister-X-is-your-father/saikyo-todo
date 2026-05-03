/**
 * Phase 6.15 loop iter 686 (mode-D Desktop a11y) —
 * src/app/page.tsx (Workspace 一覧 root page) の `<main>` に id="main-content" 追加
 * (skip-to-main link が target にできるように、WCAG 2.4.1 Bypass Blocks 完成)。
 *
 * 課題: src/app/layout.tsx 行 71-76 の `<a href="#main-content">メインコンテンツへスキップ</a>`
 *   は keyboard ユーザ用 skip link で全 page に適用されるが、root page (`src/app/page.tsx`)
 *   の `<main>` 要素に `id="main-content"` が付いていなかった。auth (login/signup)、
 *   ~offline、mock-timesheet、各 workspace sub-page には既に付与済だが root page だけ漏れ。
 *   → root page で skip link が機能しなかった。
 *
 * fix (1 ファイル ~1 行差分):
 *   - `<main>` に `id="main-content"` 追加
 *
 * 検証: source-side regex assert + iter515-685 invariant cross-check。
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

  // 1. main に id="main-content"
  if (/<main id="main-content" className="container mx-auto max-w-3xl space-y-8 p-6">/.test(ap)) {
    findings.push({ level: 'info', message: `app/page.tsx main id=main-content OK` })
  } else {
    findings.push({ level: 'warning', message: `app/page.tsx main id=main-content なし` })
  }

  // 2. skip link 既存 (layout.tsx)
  const ll = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (/href="#main-content"/.test(ll)) {
    findings.push({ level: 'info', message: `layout.tsx skip-to-main link 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `layout.tsx skip-to-main link 破壊` })
  }

  // 3. iter679 invariant: workspace-link 維持 (= app/page.tsx 同 file)
  if (
    /hover:bg-muted focus-visible:ring-ring block rounded-lg border p-4 transition focus-visible:ring-2 focus-visible:outline-none/.test(
      ap,
    )
  ) {
    findings.push({ level: 'info', message: `iter679 invariant: workspace-link 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter679 invariant: 破壊` })
  }

  // 4. iter685 invariant: summary focus-visible 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    /text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1\.5 rounded text-xs focus-visible:ring-2 focus-visible:outline-none/.test(
      ssd,
    )
  ) {
    findings.push({ level: 'info', message: `iter685 invariant: sprint-swimlane summary 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter685 invariant: 破壊` })
  }

  // 5. iter684 invariant: backlog DragHandle 維持
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">≡<\/span>/.test(bv)) {
    findings.push({ level: 'info', message: `iter684 invariant: DragHandle ≡ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter684 invariant: 破壊` })
  }

  console.log(`\n=== Findings (app-page-main-id-iter686) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

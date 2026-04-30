/**
 * Phase 6.15 loop iter 452 (mode-D Desktop a11y) — DashboardView の MUST
 * Item 一覧 `<ul>` に aria-label を追加 (iter427-451 widget heading 統一
 * pattern 17 件目水平展開)、codify。
 *
 * 課題: src/components/workspace/dashboard-view.tsx:1372
 *   ```tsx
 *   <ul className="divide-y text-sm">
 *     {s.items.map((item) => ...)}
 *   </ul>
 *   ```
 *   `<ul>` に aria-label/aria-labelledby が無く、SR list nav で件数のみで
 *   context (= "MUST Item 一覧") が伝わらない。
 *
 * fix: 1 ファイル ~1 行差分。
 *   - `<ul aria-label="MUST Item 一覧 ${s.items.length} 件">`
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/dashboard-view.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. ul aria-label 配線
  if (
    /<ul className="divide-y text-sm" aria-label=\{`MUST Item 一覧 \$\{s\.items\.length\} 件`\}>/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: <ul MUST 一覧> aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <ul MUST 一覧> aria-label 配線 不在`,
    })
  }

  console.log(`\n=== Findings (dashboard-must-list-aria-iter452) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

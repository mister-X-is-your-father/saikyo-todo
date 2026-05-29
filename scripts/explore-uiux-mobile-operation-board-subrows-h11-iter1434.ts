/**
 * Phase 6.15 loop iter1434 (mode-M = Mobile audit residual): iter1428 で
 * operation-board-widget の本体 row には min-h-11 追加済だが、Quick wins
 * (推奨開閉時に表示) と 集中ブロック sub-row も同 `flex w-full ... px-1 py-0.5 text-left`
 * pattern で 24px tall → WCAG 2.5.5 未達。
 *
 * 修正: 2 sub-row button (Quick wins / 集中ブロック) の className に `min-h-11`
 * を 1 単語追加 ×2。これで widget 内の全 row button (本体 row + Quick wins +
 * 集中ブロック) が 44px tap target で統一。
 *
 * 経路 B (iter1428 の同 file 同 pattern の残箇所を source grep で発見)。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-mobile-operation-board-subrows-h11-iter1434.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // 全 row button (3 個: Quick wins / 集中ブロック / 本体 operation-board-row) が
  // min-h-11 を持つことを確認。`px-1 py-0.5 text-left` を含む 3 occurrence いずれも
  // min-h-11 を含んでいることを source 行レベルでチェック。
  const lines = src.split('\n')
  const targetLines = lines
    .map((line, i) => ({ line, i: i + 1 }))
    .filter(({ line }) => line.includes('px-1 py-0.5 text-left'))
  if (targetLines.length !== 3) {
    findings.push({
      level: 'error',
      message: `operation-board-widget.tsx: px-1 py-0.5 text-left row 出現数が ${targetLines.length} (期待 3)`,
    })
  }
  for (const { line, i } of targetLines) {
    if (!line.includes('min-h-11')) {
      findings.push({
        level: 'error',
        message: `operation-board-widget.tsx:${i}: row button に min-h-11 不在`,
      })
    }
  }

  // invariant: iter1304 expander の ::before tap area
  if (!src.includes("before:-inset-3 before:content-['']")) {
    findings.push({
      level: 'error',
      message: 'operation-board-widget.tsx: iter1304 expander ::before tap area invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1434 operation-board sub-rows min-h-11) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — Quick wins / 集中ブロック / 本体 row 全 3 個 44px tap target + iter1304 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

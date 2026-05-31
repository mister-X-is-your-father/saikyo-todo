/**
 * Phase 6.15 loop iter1590: top-items-by-time-chip ol aria-label paren を em-dash 区切に
 * migration (iter1093-1589 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"直近 X 日 Item 別稼働 top Y 件 (合計時間が多い順)"` は
 * iter1093-1589 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (top-items-by-time-chip.tsx):
 *   `直近 X 日 Item 別稼働 top Y 件 (合計時間が多い順)`
 *   → `直近 X 日 Item 別稼働 top Y 件 — 合計時間が多い順`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-top-items-by-time-chip-em-dash-iter1590.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )

  if (
    !src.includes(
      'aria-label={`直近 ${WINDOW_DAYS} 日 Item 別稼働 top ${summary.top.length} 件 — 合計時間が多い順`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'top-items-by-time-chip ol aria-label が em-dash 区切でない',
    })
  }
  if (
    src.includes(
      'aria-label={`直近 ${WINDOW_DAYS} 日 Item 別稼働 top ${summary.top.length} 件 (合計時間が多い順)`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'top-items-by-time-chip ol 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — top-items-by-time-chip ol aria-label が em-dash 区切')
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

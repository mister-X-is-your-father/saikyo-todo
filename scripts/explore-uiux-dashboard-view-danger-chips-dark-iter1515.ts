/**
 * Phase 6.15 loop iter1515: dashboard-view inline danger / warn chip 計 7 occurrences に
 * dark variant を補完 (mode-D contrast、iter1376/1493/1512/1513/1514 chip dark variant
 * pattern を本 view の inline tone class にも展開)。
 *
 * dashboard-view は ChipTone3 の 'danger' tone が無いため `'border-red-200 bg-red-50 text-red-700'`
 * を 6 箇所で inline 描画、`'border-amber-200 bg-amber-50 text-amber-700'` を 1 箇所で inline 描画。
 * 全 7 箇所が light 固定で dark mode で明色 chip が浮き contrast 不適。inline replace_all で
 * dark variant 一括補完 (iter1513 dashboard-chip TONE3_CLASS が ChipTone3 の good/warn のみで
 * danger を持たないため inline 採用)。
 *
 * 修正 (dashboard-view.tsx):
 *   6 occurrences: `border-red-200 bg-red-50 text-red-700`
 *                → 上記 + `dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300`
 *   1 occurrence:  `border-amber-200 bg-amber-50 text-amber-700`
 *                → 上記 + `dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dashboard-view-danger-chips-dark-iter1515.ts
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
  const filePath = resolve(here, '../src/components/workspace/dashboard-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 6 red chip 新形式: regex で count
  const redNewCount = (
    src.match(
      /border-red-200 bg-red-50 text-red-700 dark:border-red-900\/50 dark:bg-red-950\/30 dark:text-red-300/g,
    ) ?? []
  ).length
  if (redNewCount !== 6) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dashboard-view red chip 新形式 (dark variant) は 6 個でなく ${redNewCount} 個`,
    })
  }
  // 旧 red chip (dark suffix 無) が残存しないか
  const redOldOnly = (src.match(/border-red-200 bg-red-50 text-red-700"(?!dark)/g) ?? []).length
  // count without context: simpler approach - any "border-red-200 bg-red-50 text-red-700" not followed by " dark:"
  const allRedOccurrences = (src.match(/border-red-200 bg-red-50 text-red-700/g) ?? []).length
  if (allRedOccurrences !== 6) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dashboard-view red chip 総数 ${allRedOccurrences} が想定 6 と不一致`,
    })
  }

  // 1 amber chip 新形式
  if (
    !src.includes(
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view amber chip に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — dashboard-view の inline red 6 + amber 1 chip に dark variant 補完済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  // suppress unused redOldOnly
  void redOldOnly
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

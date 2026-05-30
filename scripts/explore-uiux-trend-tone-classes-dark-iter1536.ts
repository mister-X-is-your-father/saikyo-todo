/**
 * Phase 6.15 loop iter1536: lib/ui/trend-tone TONE_CLASS 4 constant に dark variant を補完
 * (mode-D contrast、iter1376/1493/1512-1535 chip dark sweep の central vocabulary 4 件目)。
 *
 * trend-tone.ts は 4 trend direction × 2 polarity = 8 ケース (NEUTRAL は theme-aware で
 * 1 つ、UP_POSITIVE/DOWN_POSITIVE/UP_NEGATIVE/DOWN_NEGATIVE で計 5 ケース) を返す helper。
 * 4 polarity-specific class が light 固定で iter1376/1493/1512-1535 chip dark sweep から
 * こぼれていた。central vocabulary 4 件目 (MUST iter1528 / status iter1529 / severity iter1530 /
 * chip-tone iter1531 と並ぶ高 leverage 着地)。
 *
 * 修正 (trend-tone.ts):
 *   POSITIVE_UP_CLASS:   bg-blue-50/text-blue-700/border-blue-200      + dark variant
 *   POSITIVE_DOWN_CLASS: bg-red-50/text-red-700/border-red-200          + dark variant
 *   NEGATIVE_UP_CLASS:   bg-amber-50/text-amber-700/border-amber-200    + dark variant
 *   NEGATIVE_DOWN_CLASS: bg-emerald-50/text-emerald-700/border-emerald-200 + dark variant
 *   NEUTRAL_CLASS:       既 theme-aware、touch なし
 *
 * 連動更新 (trend-tone.test.ts、13 ケース):
 *   厳密 .toBe() expected strings 4 件を新形式に migration。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-trend-tone-classes-dark-iter1536.ts
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
  const src = readFileSync(resolve(here, '../src/lib/ui/trend-tone.ts'), 'utf8')

  const checks: Array<[string, string]> = [
    [
      'POSITIVE_UP (blue)',
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50',
    ],
    [
      'POSITIVE_DOWN (red)',
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50',
    ],
    [
      'NEGATIVE_UP (amber)',
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50',
    ],
    [
      'NEGATIVE_DOWN (emerald)',
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    ],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `trend-tone.ts ${name} に dark variant が無い`,
      })
    }
  }

  // NEUTRAL_CLASS theme-aware invariant
  if (!src.includes("const NEUTRAL_CLASS = 'bg-muted text-muted-foreground border-border'")) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'trend-tone.ts NEUTRAL_CLASS が theme-aware (bg-muted) でない',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — trend-tone.ts 4 polarity-specific class に dark variant 補完済 + NEUTRAL theme-aware 維持',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

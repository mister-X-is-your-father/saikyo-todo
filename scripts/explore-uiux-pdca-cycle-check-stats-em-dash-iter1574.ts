/**
 * Phase 6.15 loop iter1574: cycle-check-stats-card の 2 dl (Lead time 統計 + ステータス分布) の
 * aria-label paren convention を em-dash 区切に migration (iter1093-1573 sweep convention 着地)。
 *
 * 旧 aria-label paren convention:
 *   - `"Lead time 統計 (平均 X / 中央 Y / 期間 Z)"` → `"Lead time 統計 — 平均 X / 中央 Y / 期間 Z"`
 *   - `"ステータス分布 (完了 X / 未完了 Y / cancelled Z)"` → `"ステータス分布 — 完了 X / 未完了 Y / cancelled Z"`
 *
 * 同 file 内 2 dl 一括変換。iter1093-1573 sweep の em-dash convention と整合。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-pdca-cycle-check-stats-em-dash-iter1574.ts
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
    resolve(here, '../src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`Lead time 統計 — 平均 ${stats.leadTimeAvgHours}h')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Lead time 統計 dl aria-label が em-dash 区切でない',
    })
  }
  if (!src.includes('aria-label={`ステータス分布 — 完了 ${stats.done}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'ステータス分布 dl aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`Lead time 統計 (平均 ${stats.leadTimeAvgHours}h')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Lead time 統計 dl 旧 paren 区切 aria-label が残存',
    })
  }
  if (src.includes('aria-label={`ステータス分布 (完了 ${stats.done}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'ステータス分布 dl 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — cycle-check-stats-card の 2 dl aria-label が em-dash 区切')
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

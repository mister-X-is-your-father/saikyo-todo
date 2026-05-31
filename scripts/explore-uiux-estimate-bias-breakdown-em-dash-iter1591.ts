/**
 * Phase 6.15 loop iter1591: estimate-bias-insight 見積バイアス内訳 role=img aria-label paren を
 * em-dash 区切に migration (iter1093-1590 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"見積バイアス内訳 (見積内 X / ±10% 以内 Y / 超過 Z)"` は
 * iter1093-1590 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (estimate-bias-insight.tsx):
 *   `見積バイアス内訳 (見積内 X / ±10% 以内 Y / 超過 Z)`
 *   → `見積バイアス内訳 — 見積内 X / ±10% 以内 Y / 超過 Z`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-estimate-bias-breakdown-em-dash-iter1591.ts
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
    resolve(here, '../src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`見積バイアス内訳 — 見積内 ${report.underCount} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'estimate-bias-insight 見積バイアス内訳 aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`見積バイアス内訳 (見積内 ${report.underCount} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'estimate-bias-insight 見積バイアス内訳 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — estimate-bias-insight 見積バイアス内訳 aria-label が em-dash 区切')
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

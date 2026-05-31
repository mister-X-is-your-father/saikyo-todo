/**
 * Phase 6.15 loop iter1594: estimate-bias-insight suggestions ul aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1593 sweep convention 着地)。
 *
 * 修正 (estimate-bias-insight.tsx):
 *   "典型的な見積分の校正推奨 X 件 (calibration Y× 適用)"
 *   → "典型的な見積分の校正推奨 X 件 — calibration Y× 適用"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-estimate-bias-suggestions-em-dash-iter1594.ts
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

  if (!src.includes('典型的な見積分の校正推奨 ${suggestions.length} 件 — calibration')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'estimate-bias suggestions aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('典型的な見積分の校正推奨 ${suggestions.length} 件 (calibration')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — estimate-bias suggestions ul が em-dash 形式')
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

/**
 * Phase 6.15 loop iter1568: pdca-panel 日次 throughput bar listitem aria-label を em-dash 区切に
 * migration (iter1093-1567 sweep convention 着地)。
 *
 * 旧 aria-label `"${d.date}: 完了 ${d.done} 件"` は ':' colon 区切で iter1093-1567 sweep の
 * em-dash convention と divergent。visible prefix ${d.date} は元から冒頭 (voice control OK)、
 * 区切のみ em-dash 化で convention 統一。
 *
 * 修正 (pdca-panel.tsx):
 *   `${d.date}: 完了 ${d.done} 件` → `${d.date} — 完了 ${d.done} 件`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-pdca-daily-bar-em-dash-iter1568.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/pdca-panel.tsx'), 'utf8')

  if (!src.includes('aria-label={`${d.date} — 完了 ${d.done} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'pdca-panel daily bar aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`${d.date}: 完了 ${d.done} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'pdca-panel daily bar 旧 colon 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — pdca-panel daily bar aria-label が em-dash 区切')
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

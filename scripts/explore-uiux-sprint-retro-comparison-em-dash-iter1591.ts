/**
 * Phase 6.15 loop iter1591: sprint-retro-widget retro-comparison group aria-label を
 * colon convention から em-dash 区切に統一 (iter1093-1590 sweep convention 着地)。
 *
 * 修正 (sprint-retro-widget.tsx):
 *   "前 Sprint 比 ${trendLabel}: 完了率 ..."
 *   → "前 Sprint 比 ${trendLabel} — 完了率 ..."
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-retro-comparison-em-dash-iter1591.ts
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
    resolve(here, '../src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )

  if (!src.includes('前 Sprint 比 ${trendLabel(cmp.trend)} — 完了率')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro comparison aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('前 Sprint 比 ${trendLabel(cmp.trend)}: 完了率')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 colon convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-retro comparison group が em-dash 形式')
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

/**
 * Phase 6.15 loop iter1595: weekly-insight-widget by-day chart aria-label を
 * paren + colon convention から em-dash 区切に統一 (iter1093-1594 sweep convention 着地)。
 *
 * 修正 (weekly-insight-widget.tsx):
 *   "曜日別完了件数 (今週 vs 前週): X"
 *   → "曜日別完了件数 — 今週 vs 前週 — X"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-weekly-by-day-em-dash-iter1595.ts
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
    resolve(here, '../src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )

  if (!src.includes('曜日別完了件数 — 今週 vs 前週 — ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly by-day aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('曜日別完了件数 (今週 vs 前週): ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren + colon convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — weekly by-day aria-label が em-dash 形式')
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

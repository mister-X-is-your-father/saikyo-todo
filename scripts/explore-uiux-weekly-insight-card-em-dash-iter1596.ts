/**
 * Phase 6.15 loop iter1596: weekly-insight-widget Card region landmark aria-label paren + colon を
 * em-dash 区切に migration (iter1093-1595 sweep convention 着地)。
 *
 * 旧 aria-label paren + colon convention `"週次 Insight (X): Y。Z"` は iter1093-1595 sweep の
 * em-dash 区切と divergent。`(hint.label)` paren + `:` colon を ` — ` em-dash 区切に統一。
 *
 * 修正 (weekly-insight-widget.tsx):
 *   `週次 Insight (${hint.label}): ${deltaLabel}。${bestDayLabel}${worstDayAriaPart}`
 *   → `週次 Insight — ${hint.label} — ${deltaLabel}。${bestDayLabel}${worstDayAriaPart}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-weekly-insight-card-em-dash-iter1596.ts
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

  if (!src.includes('aria-label={`週次 Insight — ${hint.label} — ${deltaLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly-insight-widget Card region aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`週次 Insight (${hint.label}): ${deltaLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly-insight-widget Card region 旧 paren + colon 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — weekly-insight-widget Card region aria-label が em-dash 区切')
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

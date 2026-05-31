/**
 * Phase 6.15 loop iter1609: dashboard-view 健全性 chip 群 group landmark aria-label paren を
 * em-dash 区切に migration (iter1093-1608 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"Dashboard 健全性 chip 群 (urgency / velocity / ...)"` は
 * iter1093-1608 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (dashboard-view.tsx):
 *   `Dashboard 健全性 chip 群 (urgency / velocity / momentum / ...)` →
 *   `Dashboard 健全性 chip 群 — urgency / velocity / momentum / ...`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dashboard-chip-group-em-dash-iter1609.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/dashboard-view.tsx'), 'utf8')

  if (!src.includes('aria-label="Dashboard 健全性 chip 群 — urgency / velocity / momentum / ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view 健全性 chip 群 group aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label="Dashboard 健全性 chip 群 (urgency / velocity / momentum / ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view 健全性 chip 群 group 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — dashboard-view 健全性 chip 群 group aria-label が em-dash 区切')
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

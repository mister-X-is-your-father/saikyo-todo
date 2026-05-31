/**
 * Phase 6.15 loop iter1587: gantt-view project summary group landmark aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1586 sweep convention 着地)。
 *
 * 旧 paren convention `Gantt project summary (表示範囲 X / 表示中 Item Y...)` を em-dash 区切に統一。
 * iter1578-1586 paren → em-dash sweep family と同 pattern + iter1583 同 file 内 3 summary chip と
 * 同 file 内 統一。
 *
 * 修正 (gantt-view.tsx):
 *   "Gantt project summary (...)"
 *   → "Gantt project summary — ..."
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-gantt-project-summary-em-dash-iter1587.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')

  if (!src.includes('Gantt project summary — 表示範囲 ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt project summary group aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('Gantt project summary (表示範囲 ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention gantt project summary が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — gantt project summary group が em-dash 形式')
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

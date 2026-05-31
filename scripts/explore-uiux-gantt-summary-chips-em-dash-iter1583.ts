/**
 * Phase 6.15 loop iter1583: gantt-view summary chips 3 件 aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1582 sweep convention 着地)。
 *
 * 同 file 3 chip 一括変換:
 *   - critical path chip (line 339)
 *   - baseline chip (line 351)
 *   - slip chip (line 364)
 *
 * iter1578-1582 paren → em-dash sweep family と同 pattern。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-gantt-summary-chips-em-dash-iter1583.ts
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

  if (!src.includes('critical path ${criticalCount} 件 — project 全体期間に直接影響')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'critical path chip aria-label が em-dash 形式でない',
    })
  }
  if (!src.includes('baseline ${baselineCount} 件 — 計画策定時に固定')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'baseline chip aria-label が em-dash 形式でない',
    })
  }
  if (!src.includes('遅延 ${slipItemCount} 件 — baseline より遅れている item')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'slip chip aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('critical path ${criticalCount} 件 (project')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'critical path 旧 paren convention 残存',
    })
  }
  if (src.includes('baseline ${baselineCount} 件 (計画策定時に固定')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'baseline 旧 paren convention 残存',
    })
  }
  if (src.includes('遅延 ${slipItemCount} 件 (baseline より遅れている item)、計')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'slip 旧 paren convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — gantt-view 3 summary chip aria-label が em-dash 形式')
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

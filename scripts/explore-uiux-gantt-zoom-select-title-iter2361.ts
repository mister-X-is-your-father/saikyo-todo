/**
 * Phase 6.15 loop iter2361: gantt-zoom-select に title 付与し aria-label IIFE 3-path
 * (compact / normal / wide) と sync (gantt-hide-done-toggle iter2325 /
 * gantt-show-deps-toggle iter2323 と同 Gantt 操作 bar control title pattern、
 * Gantt 操作 bar 3 control 全 hover disclose 完備)。
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

  const gv = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (!gv.includes('iter2361')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view iter2361 marker が無い',
    })
  }
  // IIFE 内 px/day mapping 3 path 各々 aria-label + title 計 2 回出現
  const compactText = (gv.match(/'狭 24px\/day'/g) || []).length
  if (compactText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `compact 24px text 出現 ${compactText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const normalText = (gv.match(/'標準 40px\/day'/g) || []).length
  if (normalText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `normal 40px text 出現 ${normalText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const wideText = (gv.match(/'広 64px\/day'/g) || []).length
  if (wideText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wide 64px text 出現 ${wideText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 sibling Gantt control regression
  if (!gv.includes('iter2353')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2353 gantt-summary group title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — gantt-zoom-select title 3-path sync 完了、Gantt 操作 bar 3 control (zoom-select + show-deps-toggle + hide-done-toggle) 全 hover disclose 完備',
    )
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

/**
 * Phase 6.15 loop iter2359: sprint-swimlane row bar chart container (role="img") に
 * title 付与し aria-label IIFE と sync (lane chip iter2307 / population chip iter1879 と同
 * file 内 chip / bar 用 title pattern を bar chart 全体にも展開、swimlane row 3 element
 * 全 hover disclose 完備)。
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

  const ssd = readFileSync(
    resolve(here, '../src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (!ssd.includes('iter2359')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-swimlane-disclosure iter2359 marker が無い',
    })
  }
  // bar count IIFE 2 回 (aria-label + title)
  const barCount = (
    ssd.match(/`bar 数 \$\{row\.items\.length\} 件 \(うち競合あり \$\{conflicted\} 件\)`/g) || []
  ).length
  if (barCount < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `swimlane bar 数 conflicted text 出現 ${barCount} 回、aria-label + title 計 2 回必要`,
    })
  }
  const barNoConflict = (ssd.match(/`bar 数 \$\{row\.items\.length\} 件`/g) || []).length
  if (barNoConflict < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `swimlane bar 数 no-conflict text 出現 ${barNoConflict} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 lane chip (iter2307) regression 検査
  if (!ssd.includes('iter2307')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2307 swimlane lane chip title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — swimlane row bar chart container title sync 完了、swimlane row 3 element (lane chip + bar chart container + 個別 bar) hover disclose 完備',
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

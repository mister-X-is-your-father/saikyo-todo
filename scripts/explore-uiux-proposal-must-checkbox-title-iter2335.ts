/**
 * Phase 6.15 loop iter2335: proposal MUST checkbox に title 付与し aria-label
 * state-dependent 2-path (ON / OFF) と sync。edit-item-must iter2273 / gantt
 * show-deps iter2323 と同 state-dependent checkbox title pattern を proposal
 * MUST にも展開。
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

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2335')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel iter2335 marker が無い',
    })
  }
  // 2-path each: aria + title 計 2 出現
  const on = (dp.match(/'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'/g) || []).length
  if (on < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `proposal MUST on path 出現 ${on} 回、aria-label + title 計 2 回必要`,
    })
  }
  const off = (dp.match(/'MUST が OFF: 通常タスク — クリックで ON、DoD 必須化'/g) || []).length
  if (off < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `proposal MUST off path 出現 ${off} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2333 regression guard
  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2333')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2333 budget-limit-input title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — proposal MUST checkbox title 2-path sync 完了、AI 分解提案 MUST toggle の hover disclosure 補完',
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

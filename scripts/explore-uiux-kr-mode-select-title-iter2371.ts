/**
 * Phase 6.15 loop iter2371: KR 進捗算出モード select に title 付与し aria-label IIFE
 * 2-path (items / manual) と sync (sprint-defaults-dow iter2369 / gantt-zoom-select
 * iter2361 と同 select title-aria sync pattern、Goal 内 KR setup form の hover disclose
 * 補完)。
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

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2371')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel iter2371 marker が無い',
    })
  }
  // 2-path 各 visible text aria-label + title 計 2 回出現
  const itemsText = (gp.match(/'items \(子 Item 完了率で自動算出\)'/g) || []).length
  if (itemsText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `KR mode items 出現 ${itemsText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const manualText = (gp.match(/'manual \(目標値 \/ 単位を手入力\)'/g) || []).length
  if (manualText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `KR mode manual 出現 ${manualText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const returnText = (
    gp.match(/return `\$\{visible\} — KR 進捗算出モード \(現在: \$\{visible\}\)`/g) || []
  ).length
  if (returnText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `KR mode return text 出現 ${returnText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 goal status transition (iter2365/2367) regression 検査
  if (!gp.includes('iter2365')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2365 goal achieved buttons title が消えている',
    })
  }
  if (!gp.includes('iter2367')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2367 goal archived reactivate title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — KR 進捗算出モード select title 2-path sync 完了、Goal 内 KR setup form の hover disclose 補完、続く kr-title / kr-target input は次 iter 候補',
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

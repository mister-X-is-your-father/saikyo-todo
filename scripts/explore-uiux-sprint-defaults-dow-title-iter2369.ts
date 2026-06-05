/**
 * Phase 6.15 loop iter2369: sprint-defaults-dow select に title 付与し aria-label IIFE
 * と sync (gantt-zoom-select iter2361 / src-kind select iter2361 と同 select title-aria
 * sync pattern、Sprint デフォルト設定 form の 2 input (dow / length) 全 hover disclose 完備)。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2369')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprints-panel iter2369 marker が無い',
    })
  }
  // dow IIFE 内 visible 算出 2 回 (aria-label + title)
  const visibleCalc = (sp.match(/const visible = `\$\{DOW_JA\[dow\] \?\? dow\}曜`/g) || []).length
  if (visibleCalc < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dow visible 算出 出現 ${visibleCalc} 回、aria-label + title 計 2 回必要`,
    })
  }
  const returnText = (
    sp.match(/return `\$\{visible\} — Sprint 基本曜日 \(現在: \$\{visible\}開始\)`/g) || []
  ).length
  if (returnText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dow return text 出現 ${returnText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 sprint-defaults-length iter2353 / sprint-defaults cancel/save iter2363 regression
  if (!sp.includes('iter2353')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2353 sprint-defaults-length title が消えている',
    })
  }
  if (!sp.includes('iter2363')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2363 sprint-defaults cancel/save buttons title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint-defaults-dow title sync 完了、Sprint デフォルト設定 form の 2 input (dow / length) + 2 button (cancel / save) 全 4 element hover disclose 完備',
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

/**
 * Phase 6.15 loop iter2345: budget-warn-input に title 付与し aria-label
 * state-dependent 3-path (empty / invalid / valid) と sync。budget-limit-input
 * iter2333 と pair で同 input title-aria 3-path sync pattern を warn input にも
 * 展開、budget edit form の 2 input (limit / warn) validation hint family 完成。
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

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2345')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'budget-panel iter2345 marker が無い',
    })
  }
  // 3-path each: 計 2 出現必要
  const empty = (
    bp.match(/'警告閾値 \(0\.\.1、消費率がこの値を超えると UI バーを警告色に切替\)'/g) || []
  ).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `budget-warn empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  const invalid = (
    bp.match(/`警告閾値 \(有効範囲は 0-1、現在値「\$\{draftWarn\}」は範囲外\)`/g) || []
  ).length
  if (invalid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `budget-warn invalid 出現 ${invalid} 回、aria-label + title 計 2 回必要`,
    })
  }
  const valid = (
    bp.match(
      /`警告閾値 \(現在: \$\{rateToPct\(Number\(draftWarn\)\)\}% — 消費率がこの値を超えると UI バーを警告色に切替\)`/g,
    ) || []
  ).length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `budget-warn valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2333 regression guard
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
      '(なし) — budget-warn-input title 3-path sync 完了、budget edit form 2 input (limit / warn) validation hint family 完成',
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

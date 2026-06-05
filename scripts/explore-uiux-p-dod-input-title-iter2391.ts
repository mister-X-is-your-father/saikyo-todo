/**
 * Phase 6.15 loop iter2391: p-dod IMEInput に title 付与し aria-label
 * state-dependent 4-path と sync (p-title iter2371 / p-desc iter2383 /
 * proposal MUST iter2335 と pair で提案編集 form 4 element family 完成)。
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

  const dpp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dpp.includes('iter2391')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel iter2391 marker が無い',
    })
  }
  // 4-path 各 text aria-label + title 計 2 回出現
  const emptyText = (
    dpp.match(/'DoD — 提案 DoD \(MUST 必須、最大 2000 文字、完了条件を具体記述\)'/g) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `p-dod empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const blankOnlyText = (
    dpp.match(/`DoD — 提案 DoD \(現在 \$\{dod\.length\} \/ 2000 文字、空白のみは不正\)`/g) || []
  ).length
  if (blankOnlyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `p-dod 空白のみ 出現 ${blankOnlyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const nearLimitText = (
    dpp.match(/`DoD — 提案 DoD \(現在 \$\{dod\.length\} \/ 2000 文字、上限近接\)`/g) || []
  ).length
  if (nearLimitText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `p-dod 上限近接 出現 ${nearLimitText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const normalText = (dpp.match(/`DoD — 提案 DoD \(現在 \$\{dod\.length\} \/ 2000 文字\)`/g) || [])
    .length
  if (normalText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `p-dod normal 出現 ${normalText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 p-title (iter2371) / p-desc (iter2383) regression 検査
  if (!dpp.includes('iter2371')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2371 p-title title が消えている',
    })
  }
  if (!dpp.includes('iter2383')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2383 p-desc title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — p-dod IMEInput title 4-path sync 完了、提案編集 form 4 element family (title + desc + dod + MUST) 全 hover disclose 完備',
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

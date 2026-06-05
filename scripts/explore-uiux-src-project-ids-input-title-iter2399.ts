/**
 * Phase 6.15 loop iter2399: src-project-ids IMEInput に title 付与し aria-label
 * 2-path と sync (src-token iter2397 と pair で Yamory connector form 必須 2 input
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

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2399')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2399 marker が無い',
    })
  }
  const emptyText = (
    ip.match(/'project IDs \(必須、1 件以上、カンマ区切り — 例: proj-a, proj-b\)'/g) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-project-ids empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const valuedText = (
    ip.match(/`project IDs \(現在 \$\{projectIds\.length\} 文字、カンマ区切り\)`/g) || []
  ).length
  if (valuedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-project-ids valued 出現 ${valuedText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2397 regression
  if (!ip.includes('iter2397')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2397 src-token title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — src-project-ids IMEInput title 2-path sync 完了、Yamory connector form 必須 2 input (token + project IDs) 全 hover disclose 完備',
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

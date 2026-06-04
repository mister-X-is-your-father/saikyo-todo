/**
 * Phase 6.15 loop iter2313: src-url input に title 付与し aria-label と sync
 * (te-description iter2303 / editTitle iter2295 と同 input title pattern、MCP path A 経由発見)。
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
  if (!ip.includes('iter2313')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2313 marker が無い',
    })
  }
  // src-url empty path aria-label + title 計 2 出現
  const urlEmpty = (
    ip.match(/'URL \(必須、https:\/\/ または http:\/\/ で始まる API endpoint\)'/g) || []
  ).length
  if (urlEmpty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-url empty 出現 ${urlEmpty} 回、aria-label + title 計 2 回必要`,
    })
  }

  const obw = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!obw.includes('iter2311')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2311 done-yesterday-toggle title が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — src-url input title sync 完了 (MCP path A 経由発見)')
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

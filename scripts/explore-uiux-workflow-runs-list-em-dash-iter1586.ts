/**
 * Phase 6.15 loop iter1586: workflows-panel wf-runs-list ul aria-label paren を em-dash 区切に
 * migration (iter1093-1585 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"直近の実行履歴 X 件 (最新順)"` は iter1093-1585 sweep の em-dash
 * 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (workflows-panel.tsx):
 *   `直近の実行履歴 ${runs.length} 件 (最新順)` → `直近の実行履歴 ${runs.length} 件 — 最新順`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-runs-list-em-dash-iter1586.ts
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
  const src = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')

  if (!src.includes('aria-label={`直近の実行履歴 ${runs.length} 件 — 最新順`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel wf-runs-list aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`直近の実行履歴 ${runs.length} 件 (最新順)`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel wf-runs-list 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflows-panel wf-runs-list aria-label が em-dash 区切')
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

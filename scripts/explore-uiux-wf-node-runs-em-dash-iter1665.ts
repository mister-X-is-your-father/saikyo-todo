/**
 * Phase 6.15 loop iter1665: workflows-panel `Workflow node 実行履歴 ${N} 件` aria-label
 * を em-dash 区切に統一 (iter1640 list aria-label sweep の補完)。
 *
 *   旧: `Workflow node 実行履歴 ${rows.length} 件`
 *   新: `Workflow node 実行履歴 — ${rows.length} 件`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-wf-node-runs-em-dash-iter1665.ts
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

  if (!src.includes('aria-label={`Workflow node 実行履歴 — ${rows.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Workflow node 実行履歴 aria-label が em-dash convention に未着地',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — Workflow node 実行履歴 aria-label が em-dash 統一')
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

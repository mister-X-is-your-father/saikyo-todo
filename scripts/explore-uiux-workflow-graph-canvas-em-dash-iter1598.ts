/**
 * Phase 6.15 loop iter1598: workflow-graph-canvas role=img aria-label paren+colon を em-dash 区切に
 * migration (iter1093-1597 sweep convention 着地)。
 *
 * 旧 aria-label paren+colon convention `"Workflow graph: X nodes (Y), Z edges"` は iter1093-1597
 * sweep の em-dash 区切と divergent。区切のみ ':' / '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (workflow-graph-canvas.tsx):
 *   `Workflow graph: X nodes (Y), Z edges` → `Workflow graph — X nodes — Y、Z edges`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-graph-canvas-em-dash-iter1598.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/workflow/workflow-graph-canvas.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`Workflow graph — ${graph.nodes.length} nodes — ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflow-graph-canvas role=img aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`Workflow graph: ${graph.nodes.length} nodes (')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflow-graph-canvas role=img 旧 paren+colon 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflow-graph-canvas role=img aria-label が em-dash 区切')
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

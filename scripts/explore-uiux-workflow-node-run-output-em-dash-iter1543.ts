/**
 * Phase 6.15 loop iter1543: workflow node-run output summary aria-label を visible-prefix
 * em-dash 形式に migration (iter1093-1542 sweep convention 着地)。
 *
 * 旧 aria-label `node ${nr.nodeId} の output (jsonb) を開閉` は visible "output (jsonb)" を
 * 中位置 "node ${nodeId} の **output (jsonb)** を開閉" に持ち voice control prefix-matching
 *「click output」 が strict prefix-match で不可 (substring 一致のみ)。
 *
 * 修正 (workflows-panel.tsx):
 *   aria-label={`node ${nr.nodeId} の output (jsonb) を開閉`}
 * → aria-label={`output (jsonb) — node ${nr.nodeId} の出力を開閉`}
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-node-run-output-em-dash-iter1543.ts
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

  if (!src.includes('aria-label={`output (jsonb) — node ${nr.nodeId} の出力を開閉`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'workflows-panel node-run output summary aria-label が em-dash 形式 "output (jsonb) — ..." でない',
    })
  }
  if (src.includes('aria-label={`node ${nr.nodeId} の output (jsonb) を開閉`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel node-run output summary 旧 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflows-panel node-run output summary aria-label が em-dash 形式')
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

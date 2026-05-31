/**
 * Phase 6.15 loop iter1581: workflow + integrations operations group aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1580 sweep convention 着地)。
 *
 * 2 file 同 pattern 同時 fix:
 *   - workflows-panel.tsx Workflow operations group
 *   - integrations-panel.tsx Source operations group
 *
 * iter1578-1580 operations group sweep (sprint / goal / active-timer) と同 pattern。
 *
 * 修正:
 *   "Xの操作 (現在: ${state}、...)" → "Xの操作 — 現在 ${state}、..."
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-source-operations-em-dash-iter1581.ts
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
  const wf = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  const ig = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  if (!wf.includes('Workflow「${wf.name}」の操作 — 現在 ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflow operations group aria-label が em-dash 形式でない',
    })
  }
  if (wf.includes('Workflow「${wf.name}」の操作 (現在: ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflow operations 旧 paren convention が残存',
    })
  }
  if (!ig.includes('Source「${src.name}」の操作 — 現在 ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations Source operations group aria-label が em-dash 形式でない',
    })
  }
  if (ig.includes('Source「${src.name}」の操作 (現在: ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations Source operations 旧 paren convention が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflow + integrations operations group が em-dash 形式')
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

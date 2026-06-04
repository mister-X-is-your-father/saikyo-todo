/**
 * Phase 6.15 loop iter2195: Goal 一覧 ul に title 付与し aria-label と sync
 * (sprints-list iter2193 / sources-list iter2191 / workflows-list iter2189 と同
 *  title=aria-label sync pattern、一覧 ul family 4 entity 揃った)。
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

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2195') || !gp.includes('title={`Goal 一覧 — ${list.data.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Goal 一覧 ul title が aria-label と sync されていない',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2193')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2193 Sprint 一覧 ul title 同期 が消えている',
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
    console.log('(なし) — Goal 一覧 ul title 同期、iter2193-1843 invariant 不変')
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

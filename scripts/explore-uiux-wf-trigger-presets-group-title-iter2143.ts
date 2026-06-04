/**
 * Phase 6.15 loop iter2143: workflows trigger プリセット group に title 付与し aria-label と sync
 * (wf-node-presets iter2141 / subtask-group iter2139 と同 title=aria-label sync pattern)。
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

  const wfp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (
    !wfp.includes('iter2143') ||
    !wfp.includes(
      'title="trigger プリセット — 4 種 manual / cron / item-event / webhook、JSON に 1 click 投入"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf trigger プリセット group title が aria-label と sync されていない',
    })
  }
  if (!wfp.includes('iter2141')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2141 wf node プリセット group title 同期 が消えている',
    })
  }

  const today = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!today.includes('title={`${it.dueTime.slice(0, 5)} — 期限時刻`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1875 today dueTime title が消えている',
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
    console.log('(なし) — wf trigger プリセット group title 付与、iter2141-1843 invariant 不変')
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

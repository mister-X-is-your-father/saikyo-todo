/**
 * Phase 6.15 loop iter2189: workflows ul list に title 付与し aria-label と sync
 * (active-timer-ops iter2187 / BulkHeaderCheckbox iter2185 と同 title=aria-label sync pattern)。
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
    !wfp.includes('iter2189') ||
    !wfp.includes('title={`Workflow 一覧 — ${list.data!.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows ul list title が aria-label と sync されていない',
    })
  }
  // iter2143 invariant (trigger preset group)
  if (!wfp.includes('iter2143')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2143 wf trigger プリセット group title 同期 が消えている',
    })
  }

  const atp = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!atp.includes('iter2187')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2187 active-timer ops group title 同期 が消えている',
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
    console.log('(なし) — workflows ul list title 同期、iter2187-1843 invariant 不変')
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

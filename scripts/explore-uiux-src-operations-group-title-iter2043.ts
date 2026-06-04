/**
 * Phase 6.15 loop iter2043: integrations source operations group に title 付与
 * (6 entity operations group family 完成形)。
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

  const integ = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!integ.includes('iter2043')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations source operations group title が無い',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2041') || !sp.includes('iter2033')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2033/2041 sprint operations title が消えている',
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2035')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2035 goal-operations-group title が消えている',
    })
  }

  const wfp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (!wfp.includes('iter2031')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2031 wf-operations-group title が消えている',
    })
  }

  const ct = readFileSync(resolve(here, '../src/components/workspace/comment-thread.tsx'), 'utf8')
  if (!ct.includes('iter2037')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2037 comment-edit-group title が消えている',
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

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — integrations src operations group title 付与、iter2041-1777 invariant 不変',
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

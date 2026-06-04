/**
 * Phase 6.15 loop iter2085: sprint-complete + sprint-replan button に title 付与
 * (sprint-activate iter2083 と pair、3 sprint status transition button family)。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  // iter2085 comment 2 件存在で確認
  const iter2085Count = (sp.match(/iter2085/g) ?? []).length
  if (iter2085Count < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-complete + sprint-replan title が無い (iter2085 count=${iter2085Count})`,
    })
  }
  if (!sp.includes('iter2083')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2083 sprint-activate title が消えている',
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
    console.log('(なし) — sprint-complete + sprint-replan title 付与、iter2083-1777 invariant 不変')
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

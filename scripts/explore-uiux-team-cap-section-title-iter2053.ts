/**
 * Phase 6.15 loop iter2053: team-capacity-panel section に title 付与
 * (7 region landmark hover summary family の完成形)。
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

  const tc = readFileSync(
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (!tc.includes('title="チームメンバー余裕時間 一覧"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity section title が無い',
    })
  }

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2051')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2051 budget progressbar title が消えている',
    })
  }

  const weekly = readFileSync(
    resolve(here, '../src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )
  if (!weekly.includes('iter2049')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2049 weekly region title が消えている',
    })
  }

  const tcv = readFileSync(resolve(here, '../src/components/workspace/taskchute-view.tsx'), 'utf8')
  if (!tcv.includes('iter2047')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2047 taskchute region title が消えている',
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
    console.log('(なし) — team-capacity section title 付与、iter2051-1777 invariant 不変')
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

/**
 * Phase 6.15 loop iter2069: workflows-panel + integrations-panel section に title 付与
 * (2 section landmark hover summary pair)。
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
  if (!wfp.includes('title="Workflow 一覧と新規作成"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel section title が無い',
    })
  }

  const integ = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!integ.includes('title="API 連携 source 一覧と新規作成"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel section title が無い',
    })
  }

  const tc = readFileSync(
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (!tc.includes('title="チームメンバー余裕時間 一覧"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2053 team-capacity section title が消えている',
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
    console.log('(なし) — workflows/integrations section title 付与、iter2067-1777 invariant 不変')
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

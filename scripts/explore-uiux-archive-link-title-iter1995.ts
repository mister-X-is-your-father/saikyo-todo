/**
 * Phase 6.15 loop iter1995: archived-items-panel item link に title 付与
 * (sprint-risk-board iter1783 と同 button hover context pattern)。
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

  const arc = readFileSync(
    resolve(here, '../src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (!arc.includes('iter1995') || !arc.includes('にアーカイブ済み')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'archived-items-panel link title が無い',
    })
  }

  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('iter1993')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1993 filter group title が消えている',
    })
  }
  if (!board.includes('title={`表示切替 — 現在 ${VIEW_LABEL_JA[view] ?? view}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1991 view-switcher group title が消えている',
    })
  }

  const tmpl = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!tmpl.includes('iter1989') || !tmpl.includes('iter1987')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1987/1989 template-items title が消えている',
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
    console.log('(なし) — archived-items link title 付与、iter1993-1777 invariant 不変')
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

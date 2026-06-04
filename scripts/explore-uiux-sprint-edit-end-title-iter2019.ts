/**
 * Phase 6.15 loop iter2019: sprints-panel sprint-edit-end date input に title 付与
 * (sprint-edit-start iter2017 と pair、sprints-panel edit form 2 date input sweep 完備)。
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
  if (!sp.includes('iter2019') || !sp.includes('Sprint 終了日 (必須、開始日以降)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-edit-end date input title が無い',
    })
  }
  if (!sp.includes('iter2017')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2017 sprint-edit-start title が消えている',
    })
  }

  const ied = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    !ied.includes('title="コメントタブ — 議論履歴 + @メンション + AI Plan 投下"') ||
    !ied.includes('iter2013')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2013/2015 item-edit-dialog tab title が消えている',
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
    console.log('(なし) — sprint-edit-end date input title 付与、iter2017-1777 invariant 不変')
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

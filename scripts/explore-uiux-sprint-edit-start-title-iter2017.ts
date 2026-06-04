/**
 * Phase 6.15 loop iter2017: sprints-panel sprint-edit-start date input に title 付与
 * (sprint-name iter1979 / sprint-goal iter1981 と同 file 内 sweep の続編)。
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
  if (!sp.includes('iter2017') || !sp.includes('Sprint 開始日 (必須、終了日以前)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-edit-start date input title が無い',
    })
  }
  if (!sp.includes('iter1981') || !sp.includes('iter1979')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1979/1981 sprints-panel create form title が消えている',
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
    console.log('(なし) — sprint-edit-start date input title 付与、iter2015-1777 invariant 不変')
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

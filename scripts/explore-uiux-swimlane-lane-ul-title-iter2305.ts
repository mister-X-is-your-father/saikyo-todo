/**
 * Phase 6.15 loop iter2305: Sprint Swimlane lane 一覧 ul に title 付与し aria-label と sync
 * (一覧 ul family 6 entity iter2291 と同 pattern、7 entity 一覧 ul family 完成)。
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

  const ssd = readFileSync(
    resolve(here, '../src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    !ssd.includes('iter2305') ||
    !ssd.includes('title={`Sprint Swimlane lane 一覧 — ${rows.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-swimlane lane ul title が aria-label と sync されていない',
    })
  }
  const laneText = (ssd.match(/`Sprint Swimlane lane 一覧 — \$\{rows\.length\} 件`/g) || []).length
  if (laneText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `Sprint Swimlane lane 一覧 出現 ${laneText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const te = readFileSync(
    resolve(here, '../src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (!te.includes('iter2303')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2303 time-entry input title が消えている',
    })
  }

  const al = readFileSync(resolve(here, '../src/components/workspace/activity-log.tsx'), 'utf8')
  if (!al.includes('iter2291')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2291 Activity 履歴 ul title が消えている',
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
    console.log(
      '(なし) — Sprint Swimlane lane 一覧 ul title sync 完了、7 entity 一覧 ul family 完成',
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

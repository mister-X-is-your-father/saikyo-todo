/**
 * Phase 6.15 loop iter2307: Sprint Swimlane lane chip に title 付与し aria-label と sync
 * (lane / conflicts prefix を sighted hover で disclose、population chip iter1879 と pair の
 * swimlane row chip family 完成)。
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
    !ssd.includes('iter2307') ||
    !ssd.includes('title={`${row.loadSummaryJa} — lane / ${row.conflictsJa}`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'swimlane lane chip title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const laneText = (ssd.match(/`\$\{row\.loadSummaryJa\} — lane \/ \$\{row\.conflictsJa\}`/g) || [])
    .length
  if (laneText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `swimlane lane chip 出現 ${laneText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // iter2305 残存
  if (!ssd.includes('iter2305')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2305 swimlane lane ul title が消えている',
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
      '(なし) — swimlane lane chip title sync 完了、swimlane row chip family (population + lane) 完成',
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

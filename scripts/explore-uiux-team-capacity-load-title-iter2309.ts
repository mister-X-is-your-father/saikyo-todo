/**
 * Phase 6.15 loop iter2309: team-capacity-panel 今日 / 今週 load chip 2 element に
 * title 付与し aria-label と sync (member-name chip iter1879 と同 file 内 chip title
 * pattern を load chip にも展開、team-capacity row 3 chip 完成)。
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

  const tcp = readFileSync(
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (
    !tcp.includes('iter2309') ||
    !tcp.includes('title={`今日 — ${formatMemberCapacityLoadJa(today)}`}') ||
    !tcp.includes('title={`今週 — ${formatMemberCapacityLoadJa(week)}`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity 今日/今週 load chip title が aria-label と sync されていない',
    })
  }
  // 各 chip aria-label + title 計 2 出現
  const todayText = (tcp.match(/`今日 — \$\{formatMemberCapacityLoadJa\(today\)\}`/g) || []).length
  if (todayText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `team-capacity 今日 chip 出現 ${todayText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const weekText = (tcp.match(/`今週 — \$\{formatMemberCapacityLoadJa\(week\)\}`/g) || []).length
  if (weekText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `team-capacity 今週 chip 出現 ${weekText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const ssd = readFileSync(
    resolve(here, '../src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (!ssd.includes('iter2307') || !ssd.includes('iter2305')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2305/2307 sprint-swimlane title が消えている',
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
      '(なし) — team-capacity 今日 / 今週 load chip title sync 完了、team-capacity row 3 chip 完成',
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

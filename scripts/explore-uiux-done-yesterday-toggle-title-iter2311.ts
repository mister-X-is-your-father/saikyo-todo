/**
 * Phase 6.15 loop iter2311: operation-board-done-yesterday-toggle に title 付与し
 * aria-label state-dependent 2-path と sync (activity-detail-toggle iter2293 と同
 * disclosure title pattern)。
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

  const obw = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!obw.includes('iter2311')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board iter2311 marker が無い',
    })
  }
  // 2-path 各 text aria-label + title 計 2 出現
  const openText = (
    obw.match(/`昨日 done \$\{board\.doneYesterday\.count\} 件 — 一覧を閉じる`/g) || []
  ).length
  if (openText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `done-yesterday open 出現 ${openText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const closedText = (
    obw.match(/`昨日 done \$\{board\.doneYesterday\.count\} 件 — 一覧を表示`/g) || []
  ).length
  if (closedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `done-yesterday closed 出現 ${closedText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const tcp = readFileSync(
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (!tcp.includes('iter2309')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2309 team-capacity load chip title が消えている',
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
    console.log('(なし) — operation-board done-yesterday-toggle title 2-path sync 完了')
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

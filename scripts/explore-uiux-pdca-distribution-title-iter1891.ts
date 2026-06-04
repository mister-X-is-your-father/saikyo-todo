/**
 * Phase 6.15 loop iter1891: pdca-panel distribution bar に title 付与
 * (quick-add-calibrated iter1889 続編、stacked bar の全 segment % を hover で disclose)。
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

  const pdca = readFileSync(resolve(here, '../src/components/workspace/pdca-panel.tsx'), 'utf8')
  if (!pdca.includes('iter1891') || !pdca.includes('title={(() =>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'pdca distribution bar title が無い',
    })
  }

  const qa = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')
  if (!qa.includes('iter1889')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1889 quick-add calibrated title が消えている',
    })
  }
  if (!qa.includes('title={`${formatEstimate(preview.estimateMinutes)} — 見積`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1887 quick-add estimate title が消えている',
    })
  }

  const subtasks = readFileSync(
    resolve(here, '../src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (!subtasks.includes('title={`${index + 1} 番目 — 深さ ${depth + 1}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1885 subtasks step title が消えている',
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

  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — pdca distribution title 付与、iter1889-1777 invariant 不変')
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

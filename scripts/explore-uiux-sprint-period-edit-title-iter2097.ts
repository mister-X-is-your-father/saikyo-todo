/**
 * Phase 6.15 loop iter2097: sprint-period-edit button title を aria-label と sync
 * (sprint-retro iter2093 / sprint-premortem iter2095 と同 title-aria divergence 修正 pattern)。
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
  if (
    !sp.includes('iter2097') ||
    !sp.includes('title={`期間 — Sprint「${sprint.name}」の期間を編集`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-period-edit title が aria-label と divergent',
    })
  }
  // 旧 静的 title 残っていないこと (JSX attribute 行先頭 indent + closing `>` で limit)
  if (/^\s+title="期間を編集"$/m.test(sp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-period-edit 旧 静的 title が残っている',
    })
  }
  if (!sp.includes('iter2095') || !sp.includes('iter2093')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2095 / iter2093 sprint-premortem/retro title が消えている',
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
    console.log('(なし) — sprint-period-edit title aria 同期、iter2095-1777 invariant 不変')
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

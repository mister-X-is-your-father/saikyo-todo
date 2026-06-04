/**
 * Phase 6.15 loop iter2153: today-view item button title を aria-label と sync
 * (personal-period iter2151 / dashboard-must-edit iter2145 と同 title=aria-label sync pattern)。
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

  const tv = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!tv.includes('iter2153') || !tv.includes('title={`${it.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'today-view item button title が aria-label と sync されていない',
    })
  }
  // iter1875 today dueTime invariant
  if (!tv.includes('title={`${it.dueTime.slice(0, 5)} — 期限時刻`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1875 today dueTime title が消えている',
    })
  }

  const pv = readFileSync(
    resolve(here, '../src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (!pv.includes('iter2151')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2151 personal-period item button title 同期 が消えている',
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
    console.log('(なし) — today-view item button title 同期、iter2151-1843 invariant 不変')
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

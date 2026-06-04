/**
 * Phase 6.15 loop iter2167: コメント一覧 ul に title 付与し aria-label と sync
 * (pdca-progressbar iter2165 / retro-comparison iter2163 / template-items-list iter2159 と同
 *  title=aria-label sync pattern)。
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

  const ct = readFileSync(resolve(here, '../src/components/workspace/comment-thread.tsx'), 'utf8')
  if (!ct.includes('iter2167') || !ct.includes('title={`コメント一覧 — ${comments!.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'コメント一覧 ul title が aria-label と sync されていない',
    })
  }

  const cc = readFileSync(
    resolve(here, '../src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (!cc.includes('iter2165')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2165 PDCA Cycle progressbar title 同期 が消えている',
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
    console.log('(なし) — コメント一覧 ul title 付与、iter2165-1843 invariant 不変')
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

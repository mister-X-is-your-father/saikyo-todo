/**
 * Phase 6.15 loop iter2149: op-board quick-wins + focus-blocks button title を aria-label と sync
 * (filter-count iter2147 / dashboard-must-edit iter2145 と同 title=aria-label sync pattern)。
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

  const op = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  const iter2149Count = (op.match(/iter2149/g) ?? []).length
  if (iter2149Count < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter2149 marker 不足 (count=${iter2149Count}、quick-wins + focus-blocks 2 個必要)`,
    })
  }
  if (
    !op.includes('title={`${it.title} を開く — 見積 ${it.estimateMin}分`}') ||
    !op.includes('title={`${it.title} を開く — 集中 ${it.estimateMin}分`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'op-board buttons title が aria-label と sync されていない',
    })
  }

  const ib = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!ib.includes('iter2147')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2147 filter-count title 同期 が消えている',
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
    console.log(
      '(なし) — op-board quick-wins + focus-blocks button title 同期、iter2147-1843 invariant 不変',
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

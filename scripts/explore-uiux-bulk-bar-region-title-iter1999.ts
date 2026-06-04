/**
 * Phase 6.15 loop iter1999: bulk-action-bar region に title 付与
 * (iter1997 decompose-proposals bulk group と同 region/group summary pattern)。
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

  const bb = readFileSync(resolve(here, '../src/components/workspace/bulk-action-bar.tsx'), 'utf8')
  if (!bb.includes('title={`一括操作 — ${count} 件選択中`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'bulk-action-bar region title が無い',
    })
  }

  const dec = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    !dec.includes(
      'title={`AI 分解提案の bulk 操作 — 全て採用 / 全て却下 / 再分解、保留中 ${list.length} 件`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1997 decompose-proposals bulk group title が消えている',
    })
  }

  const arc = readFileSync(
    resolve(here, '../src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (!arc.includes('iter1995')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1995 archived-items link title が消えている',
    })
  }

  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('iter1993')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1993 filter group title が消えている',
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
    console.log('(なし) — bulk-action-bar region title 付与、iter1997-1777 invariant 不変')
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

/**
 * Phase 6.15 loop iter2001: team-capacity-panel summary toggle に title 付与
 * (theme-toggle iter1971 と同 state-dependent toggle pattern)。
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

  const tc = readFileSync(
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (
    !tc.includes("'チームメンバー 余裕時間 (今日 / 今週) — 閉じる'") ||
    !tc.includes('iter2001')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity summary toggle title が無い',
    })
  }

  const bb = readFileSync(resolve(here, '../src/components/workspace/bulk-action-bar.tsx'), 'utf8')
  if (!bb.includes('title={`一括操作 — ${count} 件選択中`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1999 bulk-action-bar title が消えている',
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
      message: 'iter1997 decompose-proposals bulk title が消えている',
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
    console.log('(なし) — team-capacity summary toggle title 付与、iter1999-1777 invariant 不変')
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

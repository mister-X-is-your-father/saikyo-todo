/**
 * Phase 6.15 loop iter2009: item-edit-dialog tab-summary に title 付与
 * (tab-base iter2007 と pair、6 tab sweep の 2 個目)。
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

  const ied = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (!ied.includes('title="サマリタブ — この案件の進捗 / 依存 / 最終更新を一目で確認"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog tab-summary title が無い',
    })
  }
  if (!ied.includes('title="基本タブ — タイトル / 状態 / 期限 / MUST / 担当 / Tag / DoD を編集"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2007 tab-base title が消えている',
    })
  }

  const pdca = readFileSync(resolve(here, '../src/components/workspace/pdca-panel.tsx'), 'utf8')
  if (!pdca.includes('title={`集計期間 — 現在 ${days} 日、30 / 90 から選択`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2005 pdca title が消えている',
    })
  }

  const period = readFileSync(
    resolve(here, '../src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (!period.includes('iter2003')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2003 period-goal save title が消えている',
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
    console.log('(なし) — item-edit-dialog tab-summary title 付与、iter2007-1777 invariant 不変')
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

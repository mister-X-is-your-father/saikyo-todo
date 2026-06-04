/**
 * Phase 6.15 loop iter2013: item-edit-dialog tab-dependencies に title 付与
 * (6 tab sweep の 4 個目)。
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
  if (!ied.includes('iter2013') || !ied.includes('依存タブ — 未完了の前提')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog tab-dependencies title が無い',
    })
  }
  if (!ied.includes('iter2011')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2011 tab-subtasks title が消えている',
    })
  }
  if (!ied.includes('title="サマリタブ — この案件の進捗 / 依存 / 最終更新を一目で確認"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2009 tab-summary title が消えている',
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
      '(なし) — item-edit-dialog tab-dependencies title 付与、iter2011-1777 invariant 不変',
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

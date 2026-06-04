/**
 * Phase 6.15 loop iter2129: Sprint デフォルト編集 form operations group に title 付与し
 * aria-label と sync (sprint-period-progress iter2127 / budget-edit-btn iter2123 と同
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (
    !sp.includes('iter2129') ||
    !sp.includes('title="Sprint デフォルト編集の操作 — キャンセル / 保存"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Sprint デフォルト編集 group title が aria-label と sync されていない',
    })
  }
  // iter2127 invariant
  if (!sp.includes('iter2127')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2127 Sprint 期間進捗 title 同期 が消えている',
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
    console.log('(なし) — Sprint デフォルト編集 group title 付与、iter2127-1843 invariant 不変')
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

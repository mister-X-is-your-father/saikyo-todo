/**
 * Phase 6.15 loop iter2139: subtask group に title 付与し aria-label と sync
 * (budget-edit-ops iter2137 / proposal-ops iter2135 / comment-ops iter2133 と同
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')
  if (
    !sp.includes('iter2139') ||
    !sp.includes('title={`グループ「${item.title}」 — 子タスク ${grandchildren.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtask group title が aria-label と sync されていない',
    })
  }
  // iter2113 invariant (subtask-outdent/indent)
  const iter2113Count = (sp.match(/iter2113/g) ?? []).length
  if (iter2113Count < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2113 subtask-outdent/indent title 同期 が消えている',
    })
  }

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2137')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2137 budget-edit-ops group title 同期 が消えている',
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
    console.log('(なし) — subtask group title 付与、iter2137-1843 invariant 不変')
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

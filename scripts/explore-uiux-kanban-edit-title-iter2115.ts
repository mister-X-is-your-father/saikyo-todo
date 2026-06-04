/**
 * Phase 6.15 loop iter2115: kanban-edit button title を aria-label と sync
 * (subtask-outdent/indent iter2113 / dep-remove iter2111 と同 title-aria divergence
 *  修正 pattern、em-dash visible-prefix convention 同期)。
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

  const kv = readFileSync(resolve(here, '../src/components/workspace/kanban-view.tsx'), 'utf8')
  if (
    !kv.includes('iter2115') ||
    !kv.includes('title={`編集 — 「${item.title}」を編集 (✎ アイコン)`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kanban-edit title が aria-label と divergent (em-dash convention 不在)',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/title=\{`「\$\{item\.title\}」を編集`\}/.test(kv)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kanban-edit 旧 title が残っている',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')
  const iter2113Count = (sp.match(/iter2113/g) ?? []).length
  if (iter2113Count < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2113 subtask-outdent/indent title 同期 が消えている',
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
    console.log('(なし) — kanban-edit title 同期、iter2113-1843 invariant 不変')
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

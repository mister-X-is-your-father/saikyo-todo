/**
 * Phase 6.15 loop iter2113: subtask-outdent + subtask-indent button title を
 * state-dependent aria-label と 3-4 path sync
 * (dep-remove iter2111 / proposal-accept/reject iter2109 と同 title-aria divergence
 *  修正 pattern)。
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
  const iter2113Count = (sp.match(/iter2113/g) ?? []).length
  if (iter2113Count < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter2113 marker が不足 (count=${iter2113Count}、outdent + indent 2 個必要)`,
    })
  }
  if (
    !sp.includes('アウトデント — 「${item.title}」は root のためアウトデント不可') ||
    !sp.includes('インデント — 深さ ${MAX_TREE_DEPTH} を超えるためインデント不可')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtask-outdent/indent title が aria-label と divergent',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/^\s+title="アウトデント \(Alt\+←\)"$/m.test(sp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtask-outdent 旧 静的 title が残っている',
    })
  }
  if (/^\s+title="インデント \(Alt\+→\)"$/m.test(sp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtask-indent 旧 静的 title が残っている',
    })
  }

  const dep = readFileSync(
    resolve(here, '../src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (!dep.includes('iter2111')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2111 dep-remove title 同期 が消えている',
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
    console.log('(なし) — subtask-outdent + indent title 同期、iter2111-1843 invariant 不変')
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

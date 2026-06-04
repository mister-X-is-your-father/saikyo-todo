/**
 * Phase 6.15 loop iter2133: comment ops group (編集 / 削除) に title 付与し aria-label と sync
 * (proposal-edit-ops iter2131 / sprint-defaults-ops iter2129 と同 title=aria-label sync pattern)。
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
  if (
    !ct.includes('iter2133') ||
    !ct.includes(
      "title={`コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」の操作 — 編集 / 削除、自分の投稿のみ`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'comment ops group title が aria-label と sync されていない',
    })
  }

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2131')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2131 proposal edit ops group title 同期 が消えている',
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
    console.log('(なし) — comment ops group title 付与、iter2131-1843 invariant 不変')
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

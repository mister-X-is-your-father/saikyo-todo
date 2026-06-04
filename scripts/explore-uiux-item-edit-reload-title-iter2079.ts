/**
 * Phase 6.15 loop iter2079: item-edit-dialog reload button に title 付与
 * (破壊的 action hover context pattern、destructive action awareness)。
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
  if (
    !ied.includes('title="最新を読み込み — 自分の編集内容を破棄してサーバの最新値を読み込み直す"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit reload button title が無い',
    })
  }

  const kb = readFileSync(
    resolve(here, '../src/components/shared/keybindings-help-modal.tsx'),
    'utf8',
  )
  if (!kb.includes('title="キーボードショートカット一覧"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2071 keybindings dialog title が消えている',
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
    console.log('(なし) — item-edit reload button title 付与、iter2077-1777 invariant 不変')
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

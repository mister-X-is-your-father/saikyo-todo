/**
 * Phase 6.15 loop iter2123: budget-edit-btn に title を付与し aria-label と sync
 * (item-edit-set-baseline iter2121 / clear-baseline iter2119 と同 title=aria-label
 *  sync pattern、aria-label のみで title 無いケースの disclose 拡張)。
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

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (
    !bp.includes('iter2123') ||
    !bp.includes('title="上限を変更 — AI 月次コスト上限と警告閾値の編集モードを開く"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'budget-edit-btn title が aria-label と sync されていない',
    })
  }

  const ied = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (!ied.includes('iter2121') || !ied.includes('iter2119')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2121/2119 item-edit-set-baseline / clear-baseline title 同期 が消えている',
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
    console.log('(なし) — budget-edit-btn title 付与、iter2121-1843 invariant 不変')
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

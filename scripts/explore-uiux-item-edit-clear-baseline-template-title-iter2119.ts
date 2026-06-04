/**
 * Phase 6.15 loop iter2119: item-edit-clear-baseline + item-edit-save-as-template button title を
 * state-dependent aria-label と 2-path sync (gantt-summary iter2117 / kanban-edit iter2115 と
 *  同 title-aria divergence 修正 pattern)。
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
  const iter2119Count = (ied.match(/iter2119/g) ?? []).length
  if (iter2119Count < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter2119 marker 不足 (count=${iter2119Count}、clear-baseline + save-as-template 2 個必要)`,
    })
  }
  if (
    !ied.includes('クリア中… — 「${item.title}」のベースラインをクリア中') ||
    !ied.includes('保存中… — 「${item.title}」を Template に保存中')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'item-edit-clear-baseline / save-as-template title が aria-label と 2-path divergent',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/^\s+title="baseline 列を NULL に戻す"$/m.test(ied)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-clear-baseline 旧 静的 title が残っている',
    })
  }
  if (
    /^\s+title="この Item と全ての子孫 \(subtask\) を Template として保存 \(再利用可\)"$/m.test(ied)
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-save-as-template 旧 静的 title が残っている',
    })
  }

  const gv = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (!gv.includes('iter2117')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2117 gantt-summary chips title 同期 が消えている',
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
      '(なし) — item-edit-clear-baseline + save-as-template title 同期、iter2117-1843 invariant 不変',
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

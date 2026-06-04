/**
 * Phase 6.15 loop iter2117: gantt-summary-critical / baseline / slip 3 chip の title を
 * aria-label と count + em-dash 統一 sync (kanban-edit iter2115 / subtask-outdent
 *  iter2113 と同 title-aria divergence 修正 pattern)。
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

  const gv = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  const iter2117Count = (gv.match(/iter2117/g) ?? []).length
  if (iter2117Count < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter2117 marker 不足 (count=${iter2117Count}、critical/baseline/slip 3 個必要)`,
    })
  }
  if (
    !gv.includes(
      'title={`critical path ${criticalCount} 件 — project 全体期間に直接影響、遅延すると全体遅延`}',
    ) ||
    !gv.includes(
      'title={`baseline ${baselineCount} 件 — 計画策定時に固定した開始/終了日、実績との遅延差分計測の基準`}',
    ) ||
    !gv.includes(
      'title={`遅延 ${slipItemCount} 件 — baseline より遅れている item、計 ${totalSlipDays} 日`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-summary 3 chip title が aria-label と count 同期されていない',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/^\s+title="critical path 上の item/m.test(gv)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-summary-critical 旧 静的 title が残っている',
    })
  }
  if (/^\s+title="baseline = 計画策定時/m.test(gv)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-summary-baseline 旧 静的 title が残っている',
    })
  }
  if (/title=\{`baseline より遅れている item の合計遅延日数`\}/.test(gv)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-summary-slip 旧 静的 title が残っている',
    })
  }

  const kv = readFileSync(resolve(here, '../src/components/workspace/kanban-view.tsx'), 'utf8')
  if (!kv.includes('iter2115')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2115 kanban-edit title 同期 が消えている',
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
    console.log('(なし) — gantt-summary 3 chip title 同期、iter2115-1843 invariant 不変')
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

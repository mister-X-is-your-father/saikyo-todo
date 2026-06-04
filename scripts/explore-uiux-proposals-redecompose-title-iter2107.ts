/**
 * Phase 6.15 loop iter2107: proposals-redecompose + proposals-redecompose-fresh button title を
 * state-dependent aria-label と sync (agent-cancel iter2105 / src-pull iter2103 /
 *  wf-run-rerun iter2101 と同 title-aria divergence 修正 pattern)。
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

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  // iter2107 marker + state-dependent title 出現
  const iter2107Count = (dp.match(/iter2107/g) ?? []).length
  if (iter2107Count < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter2107 marker が不足 (count=${iter2107Count}、redecompose + redecompose-fresh 2 個必要)`,
    })
  }
  if (!dp.includes('追加分解 — 既存の保留中 ${list.length} 件を残して追加で AI 分解')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'proposals-redecompose title が aria-label と 2-path divergent',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/^\s+title="既存の提案を残したまま追加で分解"$/m.test(dp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'proposals-redecompose 旧 静的 title が残っている',
    })
  }
  if (/^\s+title="既存提案を全て却下してから再分解"$/m.test(dp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'proposals-redecompose-fresh 旧 静的 title が残っている',
    })
  }
  // iter2105 agent-cancel invariant
  if (!dp.includes('iter2105')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2105 agent-cancel title 同期 が消えている',
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
      '(なし) — proposals-redecompose + redecompose-fresh title 同期、iter2105-1843 invariant 不変',
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

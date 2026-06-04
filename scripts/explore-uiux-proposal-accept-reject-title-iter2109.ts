/**
 * Phase 6.15 loop iter2109: proposal-accept + proposal-reject button title を
 * state-dependent aria-label と sync (proposals-redecompose iter2107 / agent-cancel iter2105 と
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

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const iter2109Count = (dp.match(/iter2109/g) ?? []).length
  if (iter2109Count < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter2109 marker が不足 (count=${iter2109Count}、accept + reject 2 個必要)`,
    })
  }
  if (
    !dp.includes('✓ 採用 — 「${proposal.title}」を採用処理中…') ||
    !dp.includes('却下処理中… — 「${proposal.title}」を却下処理中')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'proposal-accept/reject title が aria-label と 2-path divergent',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/^\s+title="採用 → 子タスクとして追加"$/m.test(dp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'proposal-accept 旧 静的 title が残っている',
    })
  }
  if (/^\s+title="却下"$/m.test(dp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'proposal-reject 旧 静的 title が残っている',
    })
  }
  if (!dp.includes('iter2107') || !dp.includes('iter2105')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2107/2105 decompose-proposals title 同期 が消えている',
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
    console.log('(なし) — proposal-accept/reject title 同期、iter2107-1843 invariant 不変')
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

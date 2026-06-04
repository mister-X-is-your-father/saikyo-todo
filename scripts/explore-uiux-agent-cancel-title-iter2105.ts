/**
 * Phase 6.15 loop iter2105: agent-cancel button title を state-dependent aria-label と 2-path sync
 * (src-pull iter2103 / wf-run-rerun iter2101 / kr-delete iter2099 と同 title-aria divergence
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

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2105') || !dp.includes("'中止 — 実行中の Agent を中止中…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'agent-cancel title が state-dependent aria-label と 2-path divergent',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/^\s+title="実行中の Agent を中止"$/m.test(dp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'agent-cancel 旧 静的 title が残っている',
    })
  }

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2103')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2103 src-pull title 同期 が消えている',
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
      '(なし) — agent-cancel title state-dependent 2-path 同期、iter2103-1843 invariant 不変',
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

/**
 * Phase 6.15 loop iter2111: dep-remove button title を state-dependent aria-label と 2-path sync
 * (proposal-accept/reject iter2109 / proposals-redecompose iter2107 と
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

  const dep = readFileSync(
    resolve(here, '../src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (!dep.includes('iter2111') || !dep.includes('解除 — 依存「${ref.title}」を解除中…')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dep-remove title が state-dependent aria-label と 2-path divergent',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/title=\{`依存「\$\{ref\.title\}」を解除`\}/.test(dep)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dep-remove 旧 静的 title が残っている',
    })
  }

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2109') || !dp.includes('iter2107')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2109/2107 decompose-proposals title 同期 が消えている',
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
      '(なし) — dep-remove title 2-path state-dependent 同期、iter2109-1843 invariant 不変',
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

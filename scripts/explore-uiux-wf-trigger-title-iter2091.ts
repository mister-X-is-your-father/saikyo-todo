/**
 * Phase 6.15 loop iter2091: wf-trigger button title を aria-label と 4-path 同期
 * (theme-toggle iter1971 と同 title-aria divergence 修正 pattern)。
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

  const wfp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (
    !wfp.includes('iter2091') ||
    !wfp.includes('実行 — Workflow「${wf.name}」は無効化中のため実行不可')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-trigger title が aria-label と 4-path 一致していない',
    })
  }
  // 旧 2-path 残っていないこと確認
  if (
    wfp.match(
      /title=\{[\s\S]*?'node が無い workflow は実行不可'[\s\S]*?'手動で sync 実行 \(各 node 10-60s timeout\)'/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-trigger 旧 2-path title が残っている',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2087')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2087 sprint-cancel title が消えている',
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
    console.log('(なし) — wf-trigger title 4-path 同期、iter2089-1777 invariant 不変')
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

/**
 * Phase 6.15 loop iter2101: wf-run-rerun button title を state-dependent aria-label と sync
 * (kr-delete iter2099 / sprint-period-edit iter2097 / sprint-premortem iter2095 /
 *  sprint-retro iter2093 と同 title-aria divergence 修正 pattern)。
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
  if (!wfp.includes('iter2101') || !wfp.includes('再 — 実行 ${r.id.slice(0, 8)} を再実行中…')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-run-rerun title が state-dependent aria-label と divergent',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/title=\{`同じ input で再実行 \(\$\{formatRunTime\(r\)\}\)`\}/.test(wfp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-run-rerun 旧 静的 title が残っている',
    })
  }
  if (!wfp.includes('iter2091')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2091 wf-trigger title が消えている',
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2099')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2099 kr-delete title 同期 が消えている',
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
    console.log('(なし) — wf-run-rerun title state-dependent 同期、iter2099-1843 invariant 不変')
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

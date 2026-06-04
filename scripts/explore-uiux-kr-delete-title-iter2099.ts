/**
 * Phase 6.15 loop iter2099: kr-delete button title を state-dependent aria-label と sync
 * (sprint-period-edit iter2097 / sprint-premortem iter2095 / sprint-retro iter2093 と
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

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2099') || !gp.includes('削除中… — KR「${kr.title}」を削除中')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kr-delete title が state-dependent aria-label と divergent',
    })
  }
  // 旧 静的 title 残っていないこと
  if (/^\s+title="KR を削除 \(soft delete\)"$/m.test(gp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kr-delete 旧 静的 title が残っている',
    })
  }
  if (!gp.includes('iter1935')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1935 KR progressbar title が消えている',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2097') || !sp.includes('iter2095') || !sp.includes('iter2093')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2097/2095/2093 sprints-panel title sync entries が消えている',
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
    console.log('(なし) — kr-delete title state-dependent 同期、iter2097-1843 invariant 不変')
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

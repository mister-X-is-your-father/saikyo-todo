/**
 * Phase 6.15 loop iter2095: sprint-premortem title state-dependent 同期
 * (sprint-retro iter2093 と pair、3-path title-aria 同期)。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (
    !sp.includes('iter2095') ||
    !sp.includes('Pre-mortem 生成中… — Sprint「${sprint.name}」の Pre-mortem を生成中')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-premortem title が state-dependent aria-label と divergent',
    })
  }
  // 旧 静的 title 残っていないこと
  if (sp.includes('title="PM Agent が想定リスクと早期警報を Pre-mortem Doc にまとめる"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-premortem 旧 静的 title が残っている',
    })
  }
  if (!sp.includes('iter2093')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2093 sprint-retro title が消えている',
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
      '(なし) — sprint-premortem title state-dependent 同期、iter2093-1777 invariant 不変',
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

/**
 * Phase 6.15 loop iter2103: src-pull button title を state-dependent aria-label と 3-path sync
 * (wf-run-rerun iter2101 / kr-delete iter2099 / sprint-period-edit iter2097 と同
 *  title-aria divergence 修正 pattern)。
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

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    !ip.includes('iter2103') ||
    !ip.includes('Pull — Source「${src.name}」は無効化中のため Pull 不可')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src-pull title が state-dependent aria-label と 3-path divergent',
    })
  }
  // 旧 静的 title 残っていないこと (JSX attribute 行先頭 indent で limit、comment 除外)
  if (/^\s+title="手動 pull \(sync 実行、30s timeout\)"$/m.test(ip)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src-pull 旧 静的 title が残っている',
    })
  }

  const wfp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (!wfp.includes('iter2101')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2101 wf-run-rerun title 同期 が消えている',
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
    console.log('(なし) — src-pull title state-dependent 3-path 同期、iter2101-1843 invariant 不変')
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

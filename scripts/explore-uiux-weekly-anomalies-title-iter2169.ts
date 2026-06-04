/**
 * Phase 6.15 loop iter2169: weekly-insight anomalies ul に title 付与し aria-label と sync
 * (comment-list iter2167 / template-items-list iter2159 と同 title=aria-label sync pattern)。
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

  const wi = readFileSync(
    resolve(here, '../src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )
  if (
    !wi.includes('iter2169') ||
    !wi.includes(
      'title={`今週の特筆事項 ${insight.anomalies.length} 件 — 集中日 / 過小日 / 期限超過 spike`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly-insight anomalies ul title が aria-label と sync されていない',
    })
  }

  const ct = readFileSync(resolve(here, '../src/components/workspace/comment-thread.tsx'), 'utf8')
  if (!ct.includes('iter2167')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2167 コメント一覧 ul title 同期 が消えている',
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
    console.log('(なし) — weekly-insight anomalies ul title 付与、iter2167-1843 invariant 不変')
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

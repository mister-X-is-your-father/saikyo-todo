/**
 * Phase 6.15 loop iter2191: API 連携 source 一覧 ul に title 付与し aria-label と sync
 * (workflows-list iter2189 / comment-list iter2167 と同 title=aria-label sync pattern)。
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
    !ip.includes('iter2191') ||
    !ip.includes('title={`API 連携 source 一覧 — ${list.data!.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'API 連携 source 一覧 ul title が aria-label と sync されていない',
    })
  }
  if (!ip.includes('iter2103')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2103 src-pull title 同期 が消えている',
    })
  }

  const wfp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (!wfp.includes('iter2189')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2189 workflows ul list title 同期 が消えている',
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
    console.log('(なし) — API 連携 source 一覧 ul title 同期、iter2189-1843 invariant 不変')
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

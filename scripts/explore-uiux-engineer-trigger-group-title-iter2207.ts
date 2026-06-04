/**
 * Phase 6.15 loop iter2207: engineer-trigger group に title 付与し aria-label と sync
 * (heartbeat-button iter2205 / risk-reasons iter2203 と同 title=aria-label sync pattern)。
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

  const et = readFileSync(
    resolve(here, '../src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    !et.includes('iter2207') ||
    !et.includes(
      'title={`「${item.title}」 — Engineer Agent に投入 (PR 自動起票 toggle / 実装起動)`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'engineer-trigger group title が aria-label と sync されていない',
    })
  }

  const hb = readFileSync(resolve(here, '../src/components/workspace/heartbeat-button.tsx'), 'utf8')
  if (!hb.includes('iter2205')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2205 heartbeat-button title 同期 が消えている',
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
    console.log('(なし) — engineer-trigger group title 同期、iter2205-1843 invariant 不変')
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

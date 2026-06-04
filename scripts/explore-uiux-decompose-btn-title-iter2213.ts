/**
 * Phase 6.15 loop iter2213: item-decompose-btn に title 付与し state-dependent aria-label と 3-path sync
 * (engineer-trigger-btn iter2211 / heartbeat-button iter2205 と同 title=aria-label sync pattern)。
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

  const idb = readFileSync(
    resolve(here, '../src/components/workspace/item-decompose-button.tsx'),
    'utf8',
  )
  if (
    !idb.includes('iter2213') ||
    !idb.includes('AI 分解 — 「${item.title}」は完了済のため AI 分解不可')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-decompose-btn title が state-dependent aria-label と 3-path sync されていない',
    })
  }

  const et = readFileSync(
    resolve(here, '../src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (!et.includes('iter2211')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2211 engineer-trigger-btn title 同期 が消えている',
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
    console.log('(なし) — item-decompose-btn title 3-path sync、iter2211-1843 invariant 不変')
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

/**
 * Phase 6.15 loop iter2187: active-timer ops group に title 付与し aria-label と sync
 * (BulkHeaderCheckbox iter2185 / taskchute-timeline iter2181 と同 title=aria-label sync pattern)。
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

  const atp = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (
    !atp.includes('iter2187') ||
    !atp.includes(
      "title={`タスクタイマーの操作 — 現在 ${running ? '計測中' : '一時停止中'}、一時停止 / 再開 / Picture-in-Picture / 停止`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer ops group title が aria-label と sync されていない',
    })
  }
  // iter2125 invariant (pip title)
  if (!atp.includes('iter2125')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2125 active-timer-pip title 同期 が消えている',
    })
  }

  const ba = readFileSync(resolve(here, '../src/components/workspace/bulk-action-bar.tsx'), 'utf8')
  if (!ba.includes('iter2185')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2185 BulkHeaderCheckbox title 同期 が消えている',
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
    console.log('(なし) — active-timer ops group title 同期、iter2185-1843 invariant 不変')
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

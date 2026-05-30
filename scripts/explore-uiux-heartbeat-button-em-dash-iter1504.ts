/**
 * Phase 6.15 loop iter1504: HeartbeatButton default aria-label を em-dash 統一
 * (regression guard、iter1100 paren format からの migration)。
 *
 * iter1100 で pending aria-label を visible-prefix em-dash 形式に修正済だが default path は
 * `'Heartbeat: MUST item の期限スキャンを手動実行 (...)' で colon convention が残存。
 * iter1226 workspace-mode-selector / iter1498 workspace dashboard nav の colon → em-dash
 * sweep と同 root、本 iter で着地。
 *
 * 修正 (heartbeat-button.tsx):
 *   default aria-label: `'Heartbeat: MUST item の期限スキャンを手動実行 (...)'`
 *                     → `'Heartbeat — MUST item の期限スキャンを手動実行 (...)'`
 *
 * pending path (`'スキャン中… — Heartbeat MUST スキャン実行中'`) は元から em-dash で
 * iter1100 invariant 維持。
 *
 * 連動更新 (scripts/explore-uiux-heartbeat-button-pending-iter1100.ts):
 *   default substring check を `'Heartbeat: MUST item` → `'Heartbeat — MUST item` に migration
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-heartbeat-button-em-dash-iter1504.ts
 * 前提: なし (source 直読 invariant)
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
  const filePath = resolve(here, '../src/components/workspace/heartbeat-button.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      "'Heartbeat — MUST item の期限スキャンを手動実行 (7d / 3d / 1d / overdue 段階で通知を作成)'",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'HeartbeatButton default aria-label が em-dash 形式でない',
    })
  }
  if (
    src.includes(
      "'Heartbeat: MUST item の期限スキャンを手動実行 (7d / 3d / 1d / overdue 段階で通知を作成)'",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'HeartbeatButton 旧 colon 区切 default aria-label が残存',
    })
  }

  // iter1100 invariant: pending em-dash 維持
  if (!src.includes("'スキャン中… — Heartbeat MUST スキャン実行中'")) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'iter1100 invariant: HeartbeatButton pending aria-label em-dash 形式が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — HeartbeatButton default + pending aria-label が em-dash convention 統一済',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

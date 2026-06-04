/**
 * Phase 6.15 loop iter2205: heartbeat-button title を state-dependent aria-label と sync
 * (旧 静的 title を削除、state-dependent 2-path 同期、risk-reasons iter2203 /
 *  keybinding-combo iter2201 と同 title-aria divergence 修正 pattern)。
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

  const hb = readFileSync(resolve(here, '../src/components/workspace/heartbeat-button.tsx'), 'utf8')
  if (
    !hb.includes('iter2205') ||
    !hb.includes("'スキャン中… — Heartbeat MUST スキャン実行中'") ||
    !hb.includes(
      "'Heartbeat — MUST item の期限スキャンを手動実行 (7d / 3d / 1d / overdue 段階で通知を作成)'",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'heartbeat-button title が state-dependent aria-label と sync されていない',
    })
  }
  // 旧 静的 title 残っていないこと
  if (hb.includes('title="MUST item を 7d / 3d / 1d / overdue 段階でスキャンして通知を作成"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'heartbeat-button 旧 静的 title が残っている',
    })
  }
  // iter2203 invariant
  const sr = readFileSync(
    resolve(here, '../src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (!sr.includes('iter2203')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2203 risk-reasons ul title 同期 が消えている',
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
    console.log('(なし) — heartbeat-button title 同期、iter2203-1843 invariant 不変')
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

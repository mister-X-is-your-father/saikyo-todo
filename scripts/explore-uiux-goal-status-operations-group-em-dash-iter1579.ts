/**
 * Phase 6.15 loop iter1579: goals-panel Goal status operations group aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1578 sweep convention 着地)。
 *
 * 旧 paren convention `"Goal「${title}」のステータス操作 (現在: ${status}、完了 / アーカイブ / 再開)"` を
 * em-dash 区切に統一。iter1578 sprint operations group と同 pattern。
 *
 * 修正 (goals-panel.tsx):
 *   "Goal「${title}」のステータス操作 (現在: ${status}、完了 / アーカイブ / 再開)"
 *   → "Goal「${title}」のステータス操作 — 現在 ${status}、完了 / アーカイブ / 再開"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goal-status-operations-group-em-dash-iter1579.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')

  if (
    !src.includes('のステータス操作 — 現在 ${goalStatusLabelJa(status)}、完了 / アーカイブ / 再開')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel status operations group aria-label が em-dash 形式でない',
    })
  }
  if (
    src.includes('のステータス操作 (現在: ${goalStatusLabelJa(status)}、完了 / アーカイブ / 再開)')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — goals-panel status operations group が em-dash 形式')
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

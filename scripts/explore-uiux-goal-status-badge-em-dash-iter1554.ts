/**
 * Phase 6.15 loop iter1554: goals-panel goal-status Badge aria-label を visible 冒頭 em-dash 形式に
 * migration (iter1093-1553 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"Goal「${goal.title}」のステータス: ${goalStatusLabelJa(status)}"` は visible
 * "${status}" (e.g., "active") を末尾に持ち voice control prefix-matching「click 完了」 が strict
 * prefix-match で不可 (substring 一致のみ)。iter1553 sprint-status Badge (sprints-panel) と同
 * pattern を goals-panel に展開。
 *
 * 修正 (goals-panel.tsx):
 *   `Goal「${goal.title}」のステータス: ${goalStatusLabelJa(status)}`
 *   → `${goalStatusLabelJa(status)} — Goal「${goal.title}」のステータス`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goal-status-badge-em-dash-iter1554.ts
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
    !src.includes('aria-label={`${goalStatusLabelJa(status)} — Goal「${goal.title}」のステータス`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goal-status Badge aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (
    src.includes('aria-label={`Goal「${goal.title}」のステータス: ${goalStatusLabelJa(status)}`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goal-status Badge 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — goal-status Badge aria-label が em-dash 形式 (visible 冒頭固定)')
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

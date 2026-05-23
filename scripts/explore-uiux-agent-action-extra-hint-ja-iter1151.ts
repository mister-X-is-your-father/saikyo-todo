/**
 * Phase 6.15 loop iter1151: agent Action input schema (extraHint / monthlyCostLimit /
 * costWarnThreshold) max/min に ja message 付与 regression guard。
 *
 * iter1151 で発見した bug:
 *   - agent/actions.ts: DecomposeItem / DecomposeGoal / GeneratePlan 各 Action の
 *     extraHint.max(500) / max(2000) に ja message 無く zod default 英語が露出
 *   - agent/cost-actions.ts: UpdateMonthlyCostLimit の monthlyCostLimitUsd.nonnegative +
 *     costWarnThresholdRatio.min(0).max(1) に ja message 無く zod default 英語が露出
 *
 * 実 supabase + agent invocation 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-agent-action-extra-hint-ja-iter1151.ts
 * 前提: なし
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

  const actionsSrc = readFileSync(resolve(here, '../src/features/agent/actions.ts'), 'utf8')
  const costSrc = readFileSync(resolve(here, '../src/features/agent/cost-actions.ts'), 'utf8')

  // actions.ts: 500 文字 (DecomposeItem + GeneratePlan で 2 出現) + 2,000 文字 (DecomposeGoal で 1 出現)
  const action500 = "'追加 hint は 500 文字以内で入力してください'"
  const action2000 = "'追加 hint は 2,000 文字以内で入力してください'"
  const c500 = actionsSrc.split(action500).length - 1
  if (c500 < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `agent actions の ja message ${action500} が ${c500} 件 (DecomposeItem + GeneratePlan で 2 件期待)`,
    })
  }
  if (!actionsSrc.includes(action2000)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `agent actions に ja message ${action2000} (DecomposeGoal) が無い`,
    })
  }

  // cost-actions.ts: monthlyCostLimitUsd + costWarnThresholdRatio min/max
  const costExpected = [
    "'月次コスト上限は 0 以上で指定してください'",
    "'警告閾値は 0 以上で指定してください'",
    "'警告閾値は 1 以下で指定してください'",
  ]
  for (const e of costExpected) {
    if (!costSrc.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `cost-actions に ja message ${e} が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — agent Action input schema 全 max/min に ja message 統一済')
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

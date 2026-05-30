/**
 * Phase 6.15 loop iter1491 (mode-F = Flicker detection): useUpdateMonthlyCostLimit 楽観 update。
 *
 * Bug: useUpdateMonthlyCostLimit (src/features/agent/cost-hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、BudgetPanel で AI コスト上限 /
 * 警告閾値を保存 click 後 ~200-500ms 待ちで「当月実績 / 上限」 / progress bar /
 * 警告 chip が新値に切り替わらない flicker。BudgetStatus は spent / limit / ratio /
 * warnThreshold / warnTriggered / exceeded の 6 field で全て派生可能 (spent は固定、
 * 残 5 field は limit + warnThreshold + spent から純算出)。
 *
 * 修正: onMutate で ['agent','budget',workspaceId] cache を fire-and-forget
 * cancelQueries + sync setQueryData で再計算した BudgetStatus に即セット
 * (limit = vars.monthlyCostLimitUsd / warnThreshold = vars.costWarnThresholdRatio ??
 * prev.warnThreshold / ratio = limit && limit > 0 ? spent/limit : 0 /
 * warnTriggered = limit !== null && ratio >= warnThreshold /
 * exceeded = limit !== null && spent >= limit)。snapshots rollback、onSettled invalidate
 * で確定値上書き (budget + cost 両 scope)。
 *
 * これで mode-F sweep 47 件目 (1437-1491)、Update 系 22 件着地 (cost-hooks 1 件目)。
 *
 * 経路 B: source-side regex assert + 過去 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-budget-limit-iter1491.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const hooks = readFileSync(resolve(process.cwd(), 'src/features/agent/cost-hooks.ts'), 'utf8')

  // 1. BudgetStatus 型 import
  if (!hooks.includes("import type { BudgetStatus } from './cost-budget'")) {
    findings.push({
      level: 'error',
      message: 'cost-hooks.ts: BudgetStatus 型 import 不在',
    })
  }
  // 2. onMutate cache 即セット
  if (!hooks.includes('qc.setQueryData<BudgetStatus>(queryKey, {')) {
    findings.push({
      level: 'error',
      message: 'cost-hooks.ts: useUpdateMonthlyCostLimit.onMutate setQueryData 不在',
    })
  }
  // 3. ratio 再計算
  if (!hooks.includes('limit !== null && limit > 0 ? prev.spent / limit : 0')) {
    findings.push({
      level: 'error',
      message: 'cost-hooks.ts: ratio 再計算 logic 不在',
    })
  }
  // 4. warnTriggered 派生
  if (!hooks.includes('limit !== null && ratio >= warnThreshold')) {
    findings.push({
      level: 'error',
      message: 'cost-hooks.ts: warnTriggered 派生 不在',
    })
  }
  // 5. exceeded 派生
  if (!hooks.includes('limit !== null && prev.spent >= limit')) {
    findings.push({
      level: 'error',
      message: 'cost-hooks.ts: exceeded 派生 不在',
    })
  }
  // 6. onError rollback
  if (!hooks.match(/onError:[^}]*qc\.setQueryData\(ctx\.queryKey, ctx\.prev\)/)) {
    findings.push({
      level: 'error',
      message: 'cost-hooks.ts: onError rollback 不在',
    })
  }
  // 7. onSettled invalidate (budget + cost 両 scope)
  if (!hooks.match(/onSettled:[\s\S]*?budget.*\n[\s\S]*?cost/)) {
    findings.push({
      level: 'error',
      message: 'cost-hooks.ts: onSettled budget+cost invalidate 不在',
    })
  }
  // 8. iter1490 useCancelInvocation invariant cross-check (回帰 guard)
  const agentHooks = readFileSync(resolve(process.cwd(), 'src/features/agent/hooks.ts'), 'utf8')
  if (!agentHooks.includes('export interface CancelInvocationVariables')) {
    findings.push({
      level: 'error',
      message: 'agent/hooks.ts: iter1490 CancelInvocationVariables invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1491 budget-limit flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateMonthlyCostLimit optimistic re-compute + iter1490 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

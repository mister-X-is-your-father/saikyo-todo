/**
 * Phase 6.15 loop iter1490 (mode-F = Flicker detection): useCancelInvocation 楽観 update。
 *
 * Bug: useCancelInvocation (src/features/agent/hooks.ts) は mutationFn のみで
 * onMutate 楽観 update を持たず、AI 分解中の「中止」 button click 後、realtime UPDATE
 * 到達まで ~2-3 秒「Researcher が分解中…」 spinner / streaming text が残り続ける flicker
 * (cancelInvocationAction は status='cancelled' を立てるだけで client cache を更新しない、
 * pm/researcher tool-loop の shouldAbort poll が ~1 iteration 遅延する設計と合わせ最悪 2-3s)。
 *
 * 修正: useCancelInvocation の variables を { invocationId, targetItemId? } に拡張、
 * targetItemId 渡し時に agentProgressKeys.byTarget(targetItemId) cache を fire-and-forget
 * cancelQueries + sync setQueryData で status='cancelled' に即セット (invocationId 一致時のみ)。
 * realtime UPDATE が確定値で上書きするので race なし、onError で prev rollback。
 * 呼び出し側 decompose-proposals-panel.tsx は parentItemId を targetItemId として渡す。
 *
 * これで mode-F sweep 46 件目 (1437-1490)、AI 系 mutation で初の optimistic
 * (useDecomposeItem/Goal/useResearchItem/useGeneratePlan は server 重処理 = deferred 継続)。
 *
 * 経路 B: source-side regex assert + 過去 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-cancel-invocation-iter1490.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const hooks = readFileSync(resolve(process.cwd(), 'src/features/agent/hooks.ts'), 'utf8')
  const panel = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. useCancelInvocation の variables type 拡張
  if (!hooks.includes('export interface CancelInvocationVariables')) {
    findings.push({
      level: 'error',
      message: 'agent/hooks.ts: CancelInvocationVariables interface 不在',
    })
  }
  // 2. targetItemId による cache 即セット
  if (
    !hooks.includes(
      "setQueryData<AgentInvocationProgress>(queryKey, { ...prev, status: 'cancelled' })",
    )
  ) {
    findings.push({
      level: 'error',
      message: 'agent/hooks.ts: useCancelInvocation.onMutate status=cancelled 即セット 不在',
    })
  }
  // 3. invocationId 一致時 guard (race 防止)
  if (!hooks.includes('prev.invocationId === vars.invocationId')) {
    findings.push({
      level: 'error',
      message: 'agent/hooks.ts: useCancelInvocation.onMutate invocationId guard 不在',
    })
  }
  // 4. onError rollback
  if (!hooks.match(/onError:[^}]*qc\.setQueryData\(ctx\.queryKey, ctx\.prev\)/)) {
    findings.push({
      level: 'error',
      message: 'agent/hooks.ts: useCancelInvocation.onError rollback 不在',
    })
  }
  // 5. caller 側 targetItemId 渡し
  if (!panel.includes('targetItemId: parentItemId')) {
    findings.push({
      level: 'error',
      message: 'decompose-proposals-panel.tsx: cancel.mutateAsync に targetItemId 不在',
    })
  }
  // 6. iter1486 baselineMutationConfig invariant cross-check (回帰 guard)
  const itemHooks = readFileSync(resolve(process.cwd(), 'src/features/item/hooks.ts'), 'utf8')
  if (!itemHooks.includes('function baselineMutationConfig')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter1486 baselineMutationConfig invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1490 cancel-invocation flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useCancelInvocation optimistic status=cancelled + iter1486 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

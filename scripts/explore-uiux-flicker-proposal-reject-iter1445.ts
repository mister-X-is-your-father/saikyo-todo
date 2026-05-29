/**
 * Phase 6.15 loop iter1445 (mode-F = Flicker detection): useRejectProposal 楽観 update。
 *
 * Bug: useRejectProposal (src/features/decompose-proposal/hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、AI 分解 staging 画面で「却下」
 * button click 後 ~200-500ms 待ちで proposal row が表示されたまま残る flicker。
 * (useDeleteWorkflow iter1442 / useSoftDeleteSchedule iter1444 / useDeleteKeyResult
 * iter1441 と同 root cause)
 *
 * 修正: onMutate で proposalKeys.pendingByParent(parentItemId) を fire-and-forget
 * cancelQueries + sync setQueryData、id match で filter 除外、snapshot 保存して
 * onError rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-proposal-reject-iter1445.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(
    resolve(process.cwd(), 'src/features/decompose-proposal/hooks.ts'),
    'utf8',
  )

  if (
    !src.includes('void qc.cancelQueries({ queryKey: proposalKeys.pendingByParent(parentItemId) })')
  ) {
    findings.push({
      level: 'error',
      message: 'decompose-proposal/hooks.ts: useRejectProposal.onMutate cancelQueries 不在',
    })
  }
  if (!src.includes('snapshot.filter((p) => p.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'decompose-proposal/hooks.ts: useRejectProposal.onMutate filter 不在',
    })
  }
  if (
    !src.includes(
      'if (ctx?.snapshot) qc.setQueryData(proposalKeys.pendingByParent(parentItemId), ctx.snapshot)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'decompose-proposal/hooks.ts: useRejectProposal.onError rollback 不在',
    })
  }
  if (!src.includes('onSettled: () => {')) {
    findings.push({
      level: 'error',
      message: 'decompose-proposal/hooks.ts: useRejectProposal.onSettled 不在',
    })
  }

  console.log(`\n=== Findings (iter1445 Proposal reject flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useRejectProposal 楽観 update (cancel/filter/rollback/onSettled) 4 fragment OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

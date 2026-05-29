/**
 * Phase 6.15 loop iter1488 (mode-F = Flicker detection): useAcceptProposal 楽観 update。
 *
 * Bug: useAcceptProposal (src/features/decompose-proposal/hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、「採用」 button click 後
 * ~200-500ms 待ちで proposal row が pending list に残り続ける flicker
 * (useRejectProposal iter1445 と同 root cause、accept 版)。
 *
 * 修正: proposal を pending list から即除外 (新 Item の append は server canonical
 * fetch で複雑な構造で生成されるため、items 側は invalidate のみ)。
 * fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate (proposal +
 * items 両 scope)。
 *
 * 経路 B: source-side regex assert + iter1445/1446/1449 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-proposal-accept-iter1488.ts
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

  if (!src.includes('snapshot.filter((p) => p.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'decompose-proposal/hooks.ts: useAcceptProposal.onMutate filter 不在',
    })
  }
  // iter1445 useRejectProposal invariant
  if (
    !src.includes('void qc.cancelQueries({ queryKey: proposalKeys.pendingByParent(parentItemId) })')
  ) {
    findings.push({
      level: 'error',
      message: 'decompose-proposal/hooks.ts: cancelQueries invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1488 Proposal accept flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useAcceptProposal filter 除外 + cancelQueries invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

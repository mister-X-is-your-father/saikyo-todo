/**
 * Phase 6.15 loop iter1446 (mode-F = Flicker detection): useRejectAllPendingProposals 楽観 update。
 *
 * Bug: useRejectAllPendingProposals は onSuccess invalidate のみで onMutate 楽観
 * update を持たず、「全て却下」 button click 後 ~200-500ms 待ちで proposal 一覧が
 * 残る flicker (useRejectProposal iter1445 と同 root cause、一括版)。
 *
 * 修正: onMutate で proposalKeys.pendingByParent を fire-and-forget cancelQueries +
 * sync setQueryData で空配列に置換、snapshot 保存して onError rollback、onSettled
 * で正規 invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-proposal-reject-all-iter1446.ts
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

  // useRejectAllPendingProposals 内の onMutate に空配列セット
  if (!src.includes('qc.setQueryData(proposalKeys.pendingByParent(parentItemId), [])')) {
    findings.push({
      level: 'error',
      message:
        'decompose-proposal/hooks.ts: useRejectAllPendingProposals.onMutate 空配列 setQueryData 不在',
    })
  }
  // iter1445 invariant (useRejectProposal の filter pattern 維持)
  if (!src.includes('snapshot.filter((p) => p.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'decompose-proposal/hooks.ts: iter1445 useRejectProposal.filter invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1446 Proposal reject-all flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useRejectAllPendingProposals 楽観 update (空配列 set) + iter1445 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1449 (mode-F = Flicker detection): useUpdateProposal 楽観 update。
 *
 * Bug: useUpdateProposal (src/features/decompose-proposal/hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、編集 form の「保存」 button click 後
 * ~200-500ms 待ちで proposal の visible title / description / MUST badge が更新前のまま
 * に見える flicker (useRejectProposal iter1445 / useUpdateItemStatus iter1013 と同 root cause)。
 *
 * 修正: onMutate で proposalKeys.pendingByParent を fire-and-forget cancelQueries +
 * sync setQueryData。id match の proposal を patch field で merge spread、snapshot
 * 保存して onError rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert + iter1445/1446 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-proposal-update-iter1449.ts
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

  if (!src.includes('p.id === vars.id ? { ...p, ...vars.patch } : p')) {
    findings.push({
      level: 'error',
      message: 'decompose-proposal/hooks.ts: useUpdateProposal.onMutate patch spread 不在',
    })
  }
  // iter1445 useRejectProposal invariant
  if (!src.includes('snapshot.filter((p) => p.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'decompose-proposal/hooks.ts: iter1445 useRejectProposal.filter invariant 喪失',
    })
  }
  // iter1446 useRejectAllPendingProposals invariant
  if (!src.includes('qc.setQueryData(proposalKeys.pendingByParent(parentItemId), [])')) {
    findings.push({
      level: 'error',
      message:
        'decompose-proposal/hooks.ts: iter1446 useRejectAllPendingProposals.空配列 set invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1449 Proposal update flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateProposal 楽観 patch + iter1445/1446 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

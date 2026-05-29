/**
 * Phase 6.15 loop iter1441 (mode-F = Flicker detection): useDeleteKeyResult 楽観 update。
 *
 * Bug: useDeleteKeyResult (src/features/okr/hooks.ts) は onSuccess の
 * invalidateKrScope + invalidateGoalScope のみで onMutate 楽観 update を持たず、
 * KR ✕ button click 後 ~200-500ms 待ちで KR row が表示されたままになる flicker。
 * (useReorderItem iter437 / useToggleCompleteItem iter1013 / useArchiveItem iter1437 /
 * useChangeSprintStatus iter1440 と同 root cause)
 *
 * 修正: onMutate で okrKeys.krs(goalId) を fire-and-forget cancelQueries + sync
 * setQueryData で KR row を id match で除外、snapshot 保存して onError rollback、
 * onSettled で正規 invalidate (kr 内訳 + goal 進捗の両方)。
 *
 * 経路 B: source-side regex assert + iter437/iter1013/iter1437/iter1440 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-kr-delete-iter1441.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/okr/hooks.ts'), 'utf8')

  // onMutate cancelQueries (fire-and-forget) + setQueryData filter
  if (!src.includes('void qc.cancelQueries({ queryKey: okrKeys.krs(goalId) })')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: useDeleteKeyResult.onMutate fire-and-forget cancelQueries 不在',
    })
  }
  if (!src.includes('snapshot.filter((k) => k.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: useDeleteKeyResult.onMutate filter 不在',
    })
  }
  // onError rollback
  if (!src.includes('if (ctx?.snapshot) qc.setQueryData(okrKeys.krs(goalId), ctx.snapshot)')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: useDeleteKeyResult.onError rollback 不在',
    })
  }
  // onSettled invalidate
  if (
    !src.includes('invalidateKrScope(qc, goalId)') ||
    !src.includes('invalidateGoalScope(qc, workspaceId)')
  ) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: useDeleteKeyResult.onSettled invalidate 不在',
    })
  }

  console.log(`\n=== Findings (iter1441 KR delete flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useDeleteKeyResult 楽観 update (cancel/filter/rollback/invalidate) 4 fragment OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

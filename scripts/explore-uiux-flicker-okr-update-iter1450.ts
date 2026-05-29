/**
 * Phase 6.15 loop iter1450 (mode-F = Flicker detection):
 * useUpdateGoal + useUpdateKeyResult 楽観 update。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * Goal / KR 編集 form 保存後 ~200-500ms 待ちで visible title / description /
 * status / weight / progressMode / target / unit が更新前のまま見える flicker
 * (useUpdateProposal iter1449 / useUpdateItemStatus iter1013 と同 root cause、
 *  Goal / KR 版)。
 *
 * 修正: 両 hook で fire-and-forget cancelQueries + sync setQueryData。id match の
 * row を input.patch で merge spread。snapshot rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert + iter1441 (useDeleteKeyResult) invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-okr-update-iter1450.ts
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

  // useUpdateGoal patch merge
  if (!src.includes('g.id === input.id ? { ...g, ...input.patch } : g')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: useUpdateGoal.onMutate patch merge 不在',
    })
  }
  // useUpdateKeyResult patch merge
  if (!src.includes('k.id === input.id ? { ...k, ...input.patch } : k')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: useUpdateKeyResult.onMutate patch merge 不在',
    })
  }
  // iter1441 useDeleteKeyResult invariant
  if (!src.includes('snapshot.filter((k) => k.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: iter1441 useDeleteKeyResult filter invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1450 Goal/KR update flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useUpdateGoal + useUpdateKeyResult 楽観 patch merge + iter1441 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

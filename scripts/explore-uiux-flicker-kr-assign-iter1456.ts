/**
 * Phase 6.15 loop iter1456 (mode-F = Flicker detection): useAssignItemToKeyResult 楽観 update。
 *
 * Bug: useAssignItemToKeyResult (src/features/okr/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、Item ↔ KR 紐付け変更後 ~200-500ms 待ちで
 * item.keyResultId が反映されない flicker
 * (useAssignItemToSprint iter1455 と同 root cause、KR 版)。
 *
 * 修正: fire-and-forget cancelQueries + sync setQueryData。itemKeys.all/workspaceId
 * scope を getQueriesData で複数 cache 横断取得、itemId match で keyResultId を即書換。
 * snapshots rollback、onSettled で invalidateGoalScope + okr/items invalidate。
 *
 * 経路 B: source-side regex assert + iter1441/1450 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-kr-assign-iter1456.ts
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

  if (!src.includes('it.id === input.itemId ? { ...it, keyResultId: input.keyResultId } : it')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: useAssignItemToKeyResult.onMutate keyResultId 書換 不在',
    })
  }
  // iter1441 useDeleteKeyResult invariant
  if (!src.includes('snapshot.filter((k) => k.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: iter1441 useDeleteKeyResult filter invariant 喪失',
    })
  }
  // iter1450 useUpdateGoal patch merge invariant
  if (!src.includes('g.id === input.id ? { ...g, ...input.patch } : g')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: iter1450 useUpdateGoal patch merge invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1456 KR assign flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useAssignItemToKeyResult keyResultId 即書換 + iter1441/1450 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

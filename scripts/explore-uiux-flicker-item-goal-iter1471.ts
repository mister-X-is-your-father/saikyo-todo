/**
 * Phase 6.15 loop iter1471 (mode-F = Flicker detection): useSetItemGoal 楽観 update。
 *
 * Bug: useSetItemGoal (src/features/item-metadata/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、ItemEditDialog の goal textarea 保存後
 * ~200-500ms 待ちで visible が更新前のまま見える flicker
 * (useUpdateItem iter1453 と同 root cause、goal 単体 field 編集版)。
 *
 * 修正: items query (multi-key) を横断 setQueryData で item.goal field を即書換。
 * snapshots rollback、onSettled で正規 invalidate (items + items/detail/id)。
 *
 * 経路 B: source-side regex assert + iter1464 useRemoveItemArtifact / iter1464
 * useRemoveItemStakeholder invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-item-goal-iter1471.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/item-metadata/hooks.ts'), 'utf8')

  if (!src.includes('it.id === input.id ? { ...it, goal: input.goal } : it')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: useSetItemGoal.onMutate goal 書換 不在',
    })
  }
  // iter1464 useRemoveItemArtifact invariant
  if (!src.includes('snapshot.filter((a) => a.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: iter1464 useRemoveItemArtifact filter invariant 喪失',
    })
  }
  // iter1464 useRemoveItemStakeholder invariant
  if (!src.includes('snapshot.filter((s) => s.userId !== input.userId)')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: iter1464 useRemoveItemStakeholder filter invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1471 SetItemGoal flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useSetItemGoal multi-key setQueryData + iter1464 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

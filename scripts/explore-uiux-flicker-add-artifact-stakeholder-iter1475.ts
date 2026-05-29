/**
 * Phase 6.15 loop iter1475 (mode-F = Flicker detection、Add 系):
 * useAddItemArtifact + useAddItemStakeholder 楽観 append。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * ItemEditDialog 内 artifact (input/output) / stakeholder (関係者) 追加後 ~200-500ms
 * 待ちで row が現れない flicker (useAddItemDependency iter1474 と同 root cause、
 *  Add 系 helper パターンの artifact / stakeholder 版)。
 *
 * 修正:
 *   - useAddItemArtifact: temp id ('temp-' + uuid) で仮 row append、server canonical
 *     fetch (onSettled invalidate) で正規 id に上書き
 *   - useAddItemStakeholder: (itemId, userId) 複合 key identity なので temp id 不要、
 *     既に存在しない userId のみ append
 * 両者 fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert + iter1464 useRemoveItemArtifact / useRemoveItemStakeholder
 * invariant cross-check + iter1471 useSetItemGoal invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-artifact-stakeholder-iter1475.ts
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

  if (!src.includes('const tempId = `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: useAddItemArtifact temp id 生成 不在',
    })
  }
  if (!src.includes('[...snapshot, tempEntry]')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: append spread 不在 (Artifact / Stakeholder 共通)',
    })
  }
  if (!src.includes('snapshot.some((s) => s.userId === input.userId)')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: useAddItemStakeholder 重複 guard 不在',
    })
  }
  // iter1464 invariants
  if (!src.includes('snapshot.filter((a) => a.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: iter1464 useRemoveItemArtifact invariant 喪失',
    })
  }
  if (!src.includes('snapshot.filter((s) => s.userId !== input.userId)')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: iter1464 useRemoveItemStakeholder invariant 喪失',
    })
  }
  // iter1471 useSetItemGoal invariant
  if (!src.includes('it.id === input.id ? { ...it, goal: input.goal } : it')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: iter1471 useSetItemGoal invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1475 Add artifact/stakeholder flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useAddItemArtifact temp id + useAddItemStakeholder append + iter1464/1471 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1484 (mode-F = Flicker detection、Add 系):
 * useCreateItem 楽観 append。
 *
 * Bug: useCreateItem (src/features/item/hooks.ts) は onSuccess invalidate のみで
 * onMutate 楽観 update を持たず、QuickAdd / ItemEditDialog / decompose 等で Item
 * 作成後 ~200-500ms 待ちで item が一覧に現れない flicker
 * (useCreateGoal iter1479 と同 root cause、Item 本丸版)。
 *
 * 修正: Item Select 型は多 field のため、最小限の Item-like object を `as unknown as Item`
 * cast で items query 群へ追加。server canonical refetch (onSettled invalidate) で
 * 完全 row に差し替わる (UI 違和感最小)。position は 'zzz~temp' で末尾近くに置く。
 * fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert + 既存 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-item-iter1484.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/item/hooks.ts'), 'utf8')

  if (!src.includes('id: `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: useCreateItem temp id 不在',
    })
  }
  // iter1437 archiveMutationConfig invariant
  if (!src.includes('archiveMutationConfig(workspaceId, true)(qc)')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter1437 archiveMutationConfig invariant 喪失',
    })
  }
  // iter1453 useUpdateItem invariant
  if (!src.includes('it.id === input.id ? { ...it, ...input.patch } : it')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter1453 useUpdateItem invariant 喪失',
    })
  }
  // iter437 useReorderItem invariant
  if (!src.includes('export function useReorderItem(workspaceId: string)')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter437 useReorderItem invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1484 CreateItem flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useCreateItem temp id + iter437/1437/1453 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

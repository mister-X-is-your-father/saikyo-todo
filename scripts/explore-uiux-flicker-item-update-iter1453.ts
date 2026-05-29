/**
 * Phase 6.15 loop iter1453 (mode-F = Flicker detection): useUpdateItem 楽観 update。
 *
 * Bug: useUpdateItem (src/features/item/hooks.ts) は onSuccess invalidate のみで
 * onMutate 楽観 update を持たず、ItemEditDialog 保存後 ~200-500ms 待ちで visible
 * title / description / status / dates / priority / MUST / DoD が更新前のまま見える
 * flicker。useUpdate{Goal,KeyResult,Workflow,Template,Proposal} 同 sweep の本丸
 * = 最も user-visible な mutation。
 *
 * 修正: fire-and-forget cancelQueries + sync setQueryData。id match の item を
 * input.patch で merge spread。snapshots rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert + iter437/iter1013/iter1437 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-item-update-iter1453.ts
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

  if (!src.includes('it.id === input.id ? { ...it, ...input.patch } : it')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: useUpdateItem.onMutate patch merge 不在',
    })
  }
  // iter437 useReorderItem invariant
  if (!src.includes('export function useReorderItem(workspaceId: string)')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter437 useReorderItem 喪失',
    })
  }
  // iter1013 useUpdateItemStatus invariant
  if (!src.includes('it.id === input.id ? { ...it, status: input.status } : it')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter1013 useUpdateItemStatus invariant 喪失',
    })
  }
  // iter1437 archiveMutationConfig invariant
  if (!src.includes('archiveMutationConfig(workspaceId, true)(qc)')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter1437 archiveMutationConfig invariant 喪失',
    })
  }
  // iter1448 useBulkUpdateItemStatus invariant
  if (!src.includes('idSet.has(it.id) ? { ...it, status: input.status } : it')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter1448 useBulkUpdateItemStatus invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1453 Item update flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateItem 楽観 patch merge + iter437/1013/1437/1448 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1448 (mode-F = Flicker detection):
 * useBulkUpdateItemStatus / useBulkSoftDeleteItem 楽観 update。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * bulk-action-bar の「<status> に」 button / 「削除」 button click 後 ~200-500ms
 * 待ちで一括選択した items の visual state (status badge / 行表示) が反映されない flicker。
 * (useUpdateItemStatus iter1013 / useArchiveItem iter1437 / useDeleteKeyResult iter1441 と
 * 同 root cause、bulk 版)
 *
 * 修正:
 *   - useBulkUpdateItemStatus: ids Set 構築、setQueryData で items.status を一括書換
 *   - useBulkSoftDeleteItem: ids Set 構築、setQueryData で items から filter 除外
 * 両者 fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert + iter1013 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-bulk-action-iter1448.ts
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

  // useBulkUpdateItemStatus: ids Set + map で status 書換
  if (!src.includes('idSet.has(it.id) ? { ...it, status: input.status } : it')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: useBulkUpdateItemStatus.onMutate ids Set + status map 不在',
    })
  }
  // useBulkSoftDeleteItem: ids Set + filter 除外
  if (!src.includes('prev.filter((it) => !idSet.has(it.id))')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: useBulkSoftDeleteItem.onMutate ids Set + filter 除外 不在',
    })
  }
  // iter1013 useUpdateItemStatus invariant 維持
  if (!src.includes('it.id === input.id ? { ...it, status: input.status } : it')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter1013 useUpdateItemStatus 単体 status map invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1448 bulk action flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useBulkUpdateItemStatus + useBulkSoftDeleteItem 楽観 update + iter1013 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

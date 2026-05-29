/**
 * Phase 6.15 loop iter1470 (mode-F = Flicker detection): useRemoveItemDependency 楽観 update。
 *
 * Bug: useRemoveItemDependency (src/features/item-dependency/hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、ItemEditDialog 依存 tab の「外す」
 * button click 後 ~200-500ms 待ちで blockedBy / blocking / related list row が
 * 残って見える flicker (useDeleteWorkflow iter1442 / useRemoveTemplateItem iter1462 と
 * 同 root cause、dependency 版)。
 *
 * 修正: Group 構造 (blockedBy/blocking/related) に対して input.type と input.fromItemId /
 * input.toItemId / itemId の関係から該当 group を判定して filter 除外。
 *   - type='blocks' で input.toItemId === itemId: blockedBy から fromItemId 除外
 *   - type='blocks' で input.fromItemId === itemId: blocking から toItemId 除外
 *   - type='relates_to': related から「もう一方の id」 を除外
 * fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-dep-remove-iter1470.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/item-dependency/hooks.ts'), 'utf8')

  if (!src.includes('snapshot.blockedBy.filter((e) => e.ref.id !== input.fromItemId)')) {
    findings.push({
      level: 'error',
      message: 'item-dependency/hooks.ts: blockedBy filter 不在',
    })
  }
  if (!src.includes('snapshot.blocking.filter((e) => e.ref.id !== input.toItemId)')) {
    findings.push({
      level: 'error',
      message: 'item-dependency/hooks.ts: blocking filter 不在',
    })
  }
  if (!src.includes('snapshot.related.filter((e) => e.ref.id !== otherId)')) {
    findings.push({
      level: 'error',
      message: 'item-dependency/hooks.ts: related filter 不在',
    })
  }

  console.log(`\n=== Findings (iter1470 Dep remove flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useRemoveItemDependency 3 group filter (blockedBy / blocking / related) OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

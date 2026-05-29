/**
 * Phase 6.15 loop iter1474 (mode-F = Flicker detection): useAddItemDependency 楽観 append。
 *
 * Bug: useAddItemDependency (src/features/item-dependency/hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、ItemEditDialog 依存 tab で「追加」
 * button click 後 ~200-500ms 待ちで blockedBy / blocking / related list に row が
 * 現れない flicker (useRemoveItemDependency iter1470 の逆向き、Group 構造への追加版)。
 *
 * 修正: items cache 横断で「相手 Item」 を id 検索 → ItemRef を構築 → 適切な group
 * に append (3 cases: blocks→blockedBy / blocks→blocking / relates_to→related)。
 * createdAt は new Date() (server canonical fetch で正規 timestamp に上書きされる)。
 * fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert + iter1470 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-dep-add-iter1474.ts
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

  // findItemInCaches helper
  if (!src.includes('function findItemInCaches(')) {
    findings.push({
      level: 'error',
      message: 'item-dependency/hooks.ts: findItemInCaches helper 不在',
    })
  }
  // itemToRef helper
  if (!src.includes('function itemToRef(')) {
    findings.push({
      level: 'error',
      message: 'item-dependency/hooks.ts: itemToRef helper 不在',
    })
  }
  // append to each group
  if (!src.includes('[...snapshot.blockedBy, entry]')) {
    findings.push({
      level: 'error',
      message: 'item-dependency/hooks.ts: blockedBy append 不在',
    })
  }
  if (!src.includes('[...snapshot.blocking, entry]')) {
    findings.push({
      level: 'error',
      message: 'item-dependency/hooks.ts: blocking append 不在',
    })
  }
  if (!src.includes('[...snapshot.related, entry]')) {
    findings.push({
      level: 'error',
      message: 'item-dependency/hooks.ts: related append 不在',
    })
  }
  // iter1470 useRemoveItemDependency invariant
  if (!src.includes('snapshot.blockedBy.filter((e) => e.ref.id !== input.fromItemId)')) {
    findings.push({
      level: 'error',
      message: 'item-dependency/hooks.ts: iter1470 useRemoveItemDependency invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1474 Dep add flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useAddItemDependency 3 group append + helper + iter1470 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

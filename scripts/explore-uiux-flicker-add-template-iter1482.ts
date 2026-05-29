/**
 * Phase 6.15 loop iter1482 (mode-F = Flicker detection、Add 系):
 * useCreateTemplate 楽観 append。
 *
 * Bug: useCreateTemplate (src/features/template/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、/templates で Template 作成後 ~200-500ms
 * 待ちで card が現れない flicker (useCreateWorkflow iter1481 と同 root cause、
 * Template 版)。
 *
 * 修正: templateKeys.list は filter (kind=manual/recurring) を含む queryKey なので
 * getQueriesData で複数 cache 横断 append。filter mismatch (kind != filter) の cache
 * には append しない方針 (UI 上 list が wrong filter で 1 item 多く見える bug 回避)。
 * temp id ('temp-' + crypto.randomUUID()) で仮 Template、createdBy 空文字。
 * fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert + iter1443/1452/1462 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-template-iter1482.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/template/hooks.ts'), 'utf8')

  if (!src.includes('id: `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useCreateTemplate temp id 不在',
    })
  }
  // kind filter mismatch guard
  if (!src.includes('filter.kind && filter.kind !== tempEntry.kind')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useCreateTemplate kind filter mismatch guard 不在',
    })
  }
  // iter1443/1452/1462 invariants
  if (!src.includes('prev.filter((t) => t.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: iter1443 useSoftDeleteTemplate invariant 喪失',
    })
  }
  if (!src.includes('t.id === input.id ? { ...t, ...input.patch } : t')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: iter1452/1462 useUpdateTemplate/Item invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1482 CreateTemplate flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useCreateTemplate temp id + kind guard + iter1443/1452/1462 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

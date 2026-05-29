/**
 * Phase 6.15 loop iter1455 (mode-F = Flicker detection): useAssignItemToSprint 楽観 update。
 *
 * Bug: useAssignItemToSprint (src/features/sprint/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、Sprint 割当変更後 ~200-500ms 待ちで
 * item.sprintId が反映されず filter `sprint=...` の view が古い結果のまま見える flicker
 * (useUpdateItem iter1453 / useUpdateItemStatus iter1013 と同 root cause、Sprint 割当版)。
 *
 * 修正: fire-and-forget cancelQueries + sync setQueryData。itemKeys.all/workspaceId scope
 * を getQueriesData で複数 cache 横断取得、itemId match で sprintId を即書換。
 * snapshots rollback、onSettled で invalidateSprintScope + items invalidate。
 *
 * 経路 B: source-side regex assert + iter1453 useUpdateItem invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-sprint-assign-iter1455.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/sprint/hooks.ts'), 'utf8')

  if (!src.includes('it.id === input.itemId ? { ...it, sprintId: input.sprintId } : it')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: useAssignItemToSprint.onMutate sprintId 書換 不在',
    })
  }
  // iter1454 useUpdateSprint invariant
  if (!src.includes('s.id === input.id ? { ...s, ...input.patch } : s')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: iter1454 useUpdateSprint patch merge invariant 喪失',
    })
  }
  // iter1440 useChangeSprintStatus invariant
  if (!src.includes('s.id === input.id ? { ...s, status: input.status } : s')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: iter1440 useChangeSprintStatus status map invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1455 Sprint assign flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useAssignItemToSprint sprintId 即書換 + iter1454/1440 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

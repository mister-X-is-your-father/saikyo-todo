/**
 * Phase 6.15 loop iter1479 (mode-F = Flicker detection、Add 系):
 * useCreateGoal + useCreateKeyResult 楽観 append。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * /goals で Goal / KR 作成後 ~200-500ms 待ちで card / row が現れない flicker
 * (useCreateTag iter1478 / useCreateSchedule iter1477 と同 root cause、OKR 版)。
 *
 * 修正: temp id で仮 entity append。Goal は workspaceKey 上 / KR は goalKey 上の
 * list を埋める。fire-and-forget cancelQueries + snapshot rollback + onSettled
 * invalidate (goal/KR 両 scope)。
 *
 * 経路 B: source-side regex assert + iter1441/1450/1456 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-goal-kr-iter1479.ts
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

  // 2 hook の temp id
  const tempIdCount = (src.match(/temp-\$\{crypto\.randomUUID\(\)\}/g) ?? []).length
  if (tempIdCount < 2) {
    findings.push({
      level: 'error',
      message: `okr/hooks.ts: temp id 数 ${tempIdCount} < 2 (Goal + KR 必要)`,
    })
  }
  // iter1441 useDeleteKeyResult invariant
  if (!src.includes('snapshot.filter((k) => k.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: iter1441 useDeleteKeyResult invariant 喪失',
    })
  }
  // iter1450 useUpdateGoal invariant
  if (!src.includes('g.id === input.id ? { ...g, ...input.patch } : g')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: iter1450 useUpdateGoal invariant 喪失',
    })
  }
  // iter1456 useAssignItemToKeyResult invariant
  if (!src.includes('it.id === input.itemId ? { ...it, keyResultId: input.keyResultId } : it')) {
    findings.push({
      level: 'error',
      message: 'okr/hooks.ts: iter1456 useAssignItemToKeyResult invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1479 CreateGoal/KR flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useCreateGoal + useCreateKeyResult temp id append + iter1441/1450/1456 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

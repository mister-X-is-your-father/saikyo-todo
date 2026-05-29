/**
 * Phase 6.15 loop iter1458 (mode-F = Flicker detection): useUpdateSchedule 楽観 update。
 *
 * Bug: useUpdateSchedule (src/features/schedule/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、Schedule 編集 (note / startAt / endAt /
 * itemId) 保存後 ~200-500ms 待ちで visible が更新前のまま見える flicker
 * (useMoveSchedule 楽観 update の note 編集版、useUpdateItem iter1453 同 root cause)。
 *
 * 修正: fire-and-forget cancelQueries + sync setQueryData。id match の schedule を
 * input.patch で field 別 merge (startAt/endAt は ISO string → new Date() 変換)。
 * snapshot rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert + useMoveSchedule invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-schedule-update-iter1458.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/schedule/hooks.ts'), 'utf8')

  if (
    !src.includes(
      'if (input.patch.startAt !== undefined) next.startAt = new Date(input.patch.startAt)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: useUpdateSchedule.onMutate startAt 変換 不在',
    })
  }
  if (!src.includes('if (input.patch.note !== undefined) next.note = input.patch.note ?? null')) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: useUpdateSchedule.onMutate note 書換 不在',
    })
  }
  // useMoveSchedule invariant (既存楽観 update)
  if (
    !src.includes(
      's.id === input.id\n              ? { ...s, startAt: new Date(input.startAt), endAt: new Date(input.endAt) }',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: useMoveSchedule.onMutate invariant 喪失',
    })
  }
  // iter1444 useSoftDeleteSchedule invariant
  if (!src.includes('snapshot.filter((s) => s.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: iter1444 useSoftDeleteSchedule filter invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1458 Schedule update flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateSchedule field merge + useMoveSchedule/iter1444 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

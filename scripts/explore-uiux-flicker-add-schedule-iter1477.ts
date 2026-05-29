/**
 * Phase 6.15 loop iter1477 (mode-F = Flicker detection、Add 系):
 * useCreateSchedule 楽観 append。
 *
 * Bug: useCreateSchedule (src/features/schedule/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、Schedule (timeline/calendar の予定 block)
 * 作成後 ~200-500ms 待ちで block が現れない flicker
 * (useAddItemArtifact iter1475 と同 root cause、Schedule 版)。
 *
 * 修正: temp id ('temp-' + crypto.randomUUID()) で仮 block append、createdBy は
 * 空文字 (server canonical で正規値上書き)、startAt/endAt は ISO string → new Date()
 * 変換。fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert + iter1444 useSoftDeleteSchedule / iter1458
 * useUpdateSchedule invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-schedule-iter1477.ts
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

  if (!src.includes('id: `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: useCreateSchedule temp id 不在',
    })
  }
  // iter1444 useSoftDeleteSchedule invariant
  if (!src.includes('snapshot.filter((s) => s.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: iter1444 useSoftDeleteSchedule invariant 喪失',
    })
  }
  // iter1458 useUpdateSchedule invariant
  if (
    !src.includes(
      'if (input.patch.startAt !== undefined) next.startAt = new Date(input.patch.startAt)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: iter1458 useUpdateSchedule invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1477 CreateSchedule flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useCreateSchedule temp id + iter1444/1458 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

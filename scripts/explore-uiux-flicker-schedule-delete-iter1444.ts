/**
 * Phase 6.15 loop iter1444 (mode-F = Flicker detection): useSoftDeleteSchedule 楽観 update。
 *
 * Bug: useSoftDeleteSchedule (src/features/schedule/hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、Schedule (timeline/calendar
 * の予定 block) 削除 button click 後 ~200-500ms 待ちで block が表示されたまま残る flicker。
 * (useDeleteWorkflow iter1442 / useSoftDeleteTemplate iter1443 / useDeleteKeyResult iter1441 と同 root cause)
 *
 * 修正: onMutate で scheduleKeys.byDate(workspaceId, date) を fire-and-forget
 * cancelQueries + sync setQueryData、id match で filter 除外、snapshot 保存して
 * onError rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-schedule-delete-iter1444.ts
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
    !src.includes('void qc.cancelQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })')
  ) {
    findings.push({
      level: 'error',
      message:
        'schedule/hooks.ts: useSoftDeleteSchedule.onMutate fire-and-forget cancelQueries 不在',
    })
  }
  if (!src.includes('snapshot.filter((s) => s.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: useSoftDeleteSchedule.onMutate filter 不在',
    })
  }
  if (
    !src.includes(
      'if (ctx?.snapshot) qc.setQueryData(scheduleKeys.byDate(workspaceId, date), ctx.snapshot)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: useSoftDeleteSchedule.onError rollback 不在',
    })
  }
  if (!src.includes('onSettled: () => {')) {
    findings.push({
      level: 'error',
      message: 'schedule/hooks.ts: useSoftDeleteSchedule.onSettled 不在',
    })
  }

  console.log(`\n=== Findings (iter1444 Schedule delete flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useSoftDeleteSchedule 楽観 update (cancel/filter/rollback/onSettled) 4 fragment OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1440 (mode-F = Flicker detection): useChangeSprintStatus 楽観 update。
 *
 * Bug: useChangeSprintStatus (src/features/sprint/hooks.ts) は onSuccess
 * invalidateSprintScope のみで onMutate 楽観 update を持たず、planning↔active↔completed
 * の status button 切替時に ~200-500ms 待つと「変えたのに反映されない」 認知が出る。
 * Sprint card の status badge / status button (aria-pressed) も同期で stale。
 *
 * 修正: onMutate で sprintKeys.list / active query 両方を fire-and-forget cancelQueries
 * + sync setQueryData。sprint.id をマッチして status を即書き換え。snapshots に既存
 * data を貯めて onError rollback。onSettled で正規 invalidate (server canonical fetch)。
 * useReorderItem iter437 / useToggleCompleteItem iter1013 / useArchiveItem iter1437
 * と同 pattern。
 *
 * 経路 B: source-side regex assert + iter437/iter1013/iter1437 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-sprint-status-iter1440.ts
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

  // useChangeSprintStatus の onMutate が fire-and-forget cancelQueries + setQueryData を持つこと
  if (
    !src.includes('void qc.cancelQueries({ queryKey: sprintKeys.list(workspaceId) })') ||
    !src.includes('void qc.cancelQueries({ queryKey: sprintKeys.active(workspaceId) })')
  ) {
    findings.push({
      level: 'error',
      message:
        'sprint/hooks.ts: useChangeSprintStatus.onMutate に fire-and-forget cancelQueries 不在',
    })
  }
  if (!src.includes('s.id === input.id ? { ...s, status: input.status } : s')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: useChangeSprintStatus.onMutate の setQueryData mapping 不在',
    })
  }
  // onError rollback
  if (
    !src.includes(
      'for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: useChangeSprintStatus.onError rollback 不在',
    })
  }
  // onSettled で invalidate
  if (!src.includes('onSettled: () => invalidateSprintScope(qc, workspaceId)')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: useChangeSprintStatus.onSettled invalidate 不在',
    })
  }

  // 同 file の他 hook (useCreateSprint / useUpdateSprint) の onSuccess invalidate 維持
  if (!src.includes('onSuccess: () => invalidateSprintScope(qc, workspaceId)')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: useCreateSprint / useUpdateSprint の invalidate invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1440 sprint status flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useChangeSprintStatus 楽観 update (cancel/set/rollback/invalidate) + 他 hook invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1460 (mode-F = Flicker detection): useUpsertPersonalPeriodGoal 楽観 update。
 *
 * Bug: useUpsertPersonalPeriodGoal (src/features/personal-period-goal/hooks.ts) は
 * onSuccess invalidate のみで onMutate 楽観 update を持たず、Daily/Weekly/Monthly
 * view の期間ゴール inline 編集 (textarea「保存」) 後 ~200-500ms 待ちで visible text
 * が更新前のまま見える flicker (useUpdateSprintDefaults iter1459 / useUpdateItem
 * iter1453 と同 root cause、PersonalPeriodGoal 版)。
 *
 * 修正: fire-and-forget cancelQueries + sync setQueryData で 1 row の text field を
 * 即書換。snapshot rollback、onSettled で正規 invalidate (vars.workspaceId / period /
 * periodKey で正しい key を構築)。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-period-goal-iter1460.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(
    resolve(process.cwd(), 'src/features/personal-period-goal/hooks.ts'),
    'utf8',
  )

  if (!src.includes('text: vars.text,')) {
    findings.push({
      level: 'error',
      message:
        'personal-period-goal/hooks.ts: useUpsertPersonalPeriodGoal.onMutate text 即書換 不在',
    })
  }
  if (
    !src.includes(
      'const key = personalPeriodGoalKeys.one(vars.workspaceId, vars.period, vars.periodKey)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'personal-period-goal/hooks.ts: key 取得 不在',
    })
  }

  console.log(`\n=== Findings (iter1460 Personal-period-goal flicker fix) ===`)
  if (findings.length === 0) console.log('(なし) — useUpsertPersonalPeriodGoal text 即書換 OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

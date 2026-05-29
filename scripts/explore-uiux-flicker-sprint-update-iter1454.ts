/**
 * Phase 6.15 loop iter1454 (mode-F = Flicker detection): useUpdateSprint 楽観 update。
 *
 * Bug: useUpdateSprint (src/features/sprint/hooks.ts) は onSuccess invalidate のみで
 * onMutate 楽観 update を持たず、Sprint 編集 form 保存後 / 期間 inline 編集後
 * ~200-500ms 待ちで visible name / goal / startDate / endDate が更新前のまま見える flicker
 * (useUpdateItem iter1453 / useChangeSprintStatus iter1440 と同 root cause、Sprint 編集版)。
 *
 * 修正: fire-and-forget cancelQueries (list + active) + sync setQueryData。sprintKeys.all
 * scope を getQueriesData で複数 cache 横断取得、各々 id match の sprint を input.patch で
 * merge spread。snapshots rollback、onSettled で invalidateSprintScope。
 *
 * 経路 B: source-side regex assert + iter1440 (useChangeSprintStatus) invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-sprint-update-iter1454.ts
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

  if (!src.includes('s.id === input.id ? { ...s, ...input.patch } : s')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: useUpdateSprint.onMutate patch merge 不在',
    })
  }
  // iter1440 useChangeSprintStatus invariant
  if (!src.includes('s.id === input.id ? { ...s, status: input.status } : s')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: iter1440 useChangeSprintStatus status map invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1454 Sprint update flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateSprint 楽観 patch merge + iter1440 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

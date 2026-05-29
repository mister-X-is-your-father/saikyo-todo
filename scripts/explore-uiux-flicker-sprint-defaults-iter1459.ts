/**
 * Phase 6.15 loop iter1459 (mode-F = Flicker detection): useUpdateSprintDefaults 楽観 update。
 *
 * Bug: useUpdateSprintDefaults (src/features/sprint/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、Sprint workspace デフォルト (基本曜日 / 期間日数)
 * 編集保存後 ~200-500ms 待ちで visible summary "基本: 月曜開始 / 14 日" や 新規
 * Sprint form の startDate auto-fill が更新前のまま見える flicker。
 *
 * 修正: fire-and-forget cancelQueries + sync setQueryData で 1 key の object 型を
 * 即書換 (startDow + lengthDays)。snapshot rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-sprint-defaults-iter1459.ts
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

  if (!src.includes('qc.setQueryData(sprintKeys.defaults(workspaceId), {')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: useUpdateSprintDefaults.onMutate object 即書換 不在',
    })
  }
  if (
    !src.includes('startDow: input.startDow,') ||
    !src.includes('lengthDays: input.lengthDays,')
  ) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: useUpdateSprintDefaults.onMutate field 書換 不在',
    })
  }
  // iter1455 useAssignItemToSprint invariant
  if (!src.includes('it.id === input.itemId ? { ...it, sprintId: input.sprintId } : it')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: iter1455 useAssignItemToSprint sprintId 書換 invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1459 Sprint defaults flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateSprintDefaults object 即書換 + iter1455 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

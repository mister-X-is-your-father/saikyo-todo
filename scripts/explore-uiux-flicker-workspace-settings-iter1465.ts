/**
 * Phase 6.15 loop iter1465 (mode-F = Flicker detection):
 * useUpdateWorkspaceDefaultMode + useUpdateTeamContext 楽観 update。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * WorkspaceModeSelector の mode 切替 (radiogroup click) 後 / チームコンテキスト
 * textarea 保存後 ~200-500ms 待ちで visible が更新前のまま見える flicker
 * (useUpdateSprintDefaults iter1459 / useUpsertPersonalPeriodGoal iter1460 と
 * 同 root cause、workspace 設定版)。
 *
 * 修正: 両 hook で fire-and-forget cancelQueries + sync setQueryData で 1 key の
 * 単純値 (defaultMode は文字列、teamContext は string) を即書換。snapshot
 * rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-workspace-settings-iter1465.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/workspace/hooks.ts'), 'utf8')

  if (!src.includes('qc.setQueryData(workspaceKeys.defaultMode(workspaceId), defaultMode)')) {
    findings.push({
      level: 'error',
      message: 'workspace/hooks.ts: useUpdateWorkspaceDefaultMode.onMutate 即書換 不在',
    })
  }
  if (!src.includes('qc.setQueryData(workspaceKeys.teamContext(workspaceId), teamContext)')) {
    findings.push({
      level: 'error',
      message: 'workspace/hooks.ts: useUpdateTeamContext.onMutate 即書換 不在',
    })
  }

  console.log(`\n=== Findings (iter1465 Workspace settings flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateWorkspaceDefaultMode + useUpdateTeamContext 楽観 update OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1442 (mode-F = Flicker detection): useDeleteWorkflow 楽観 update。
 *
 * Bug: useDeleteWorkflow (src/features/workflow/hooks.ts) は onSuccess
 * invalidateQueries のみで onMutate 楽観 update を持たず、Workflow 削除 button
 * click 後 ~200-500ms 待ちで card が表示されたまま残る flicker
 * (useDeleteKeyResult iter1441 / useArchiveItem iter1437 / useReorderItem iter437 と同 root cause)。
 *
 * 修正: onMutate で workflowKeys.list(workspaceId) を fire-and-forget cancelQueries
 * + sync setQueryData、id match で filter 除外、snapshot 保存して onError rollback、
 * onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-workflow-delete-iter1442.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/workflow/hooks.ts'), 'utf8')

  if (!src.includes('void qc.cancelQueries({ queryKey: workflowKeys.list(workspaceId) })')) {
    findings.push({
      level: 'error',
      message: 'workflow/hooks.ts: useDeleteWorkflow.onMutate fire-and-forget cancelQueries 不在',
    })
  }
  if (!src.includes('snapshot.filter((w) => w.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'workflow/hooks.ts: useDeleteWorkflow.onMutate filter 不在',
    })
  }
  if (
    !src.includes(
      'if (ctx?.snapshot) qc.setQueryData(workflowKeys.list(workspaceId), ctx.snapshot)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'workflow/hooks.ts: useDeleteWorkflow.onError rollback 不在',
    })
  }
  if (!src.includes('onSettled: () => {')) {
    findings.push({
      level: 'error',
      message: 'workflow/hooks.ts: useDeleteWorkflow.onSettled 不在',
    })
  }

  console.log(`\n=== Findings (iter1442 Workflow delete flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useDeleteWorkflow 楽観 update (cancel/filter/rollback/invalidate) 4 fragment OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

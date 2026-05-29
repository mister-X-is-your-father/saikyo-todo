/**
 * Phase 6.15 loop iter1451 (mode-F = Flicker detection): useUpdateWorkflow 楽観 update。
 *
 * Bug: useUpdateWorkflow (src/features/workflow/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、Workflow 編集 form 保存後 /「有効化」 toggle
 * 後 ~200-500ms 待ちで visible name / description / enabled state が更新前のまま
 * 見える flicker (useUpdateGoal iter1450 / useUpdateProposal iter1449 と同 root cause、
 * Workflow 版)。
 *
 * 修正: fire-and-forget cancelQueries + sync setQueryData。id match の workflow を
 * input.patch で merge spread (`{ ...w, ...input.patch }`)。snapshot rollback、
 * onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert + iter1442 (useDeleteWorkflow) invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-workflow-update-iter1451.ts
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

  if (!src.includes('w.id === input.id ? { ...w, ...input.patch } : w')) {
    findings.push({
      level: 'error',
      message: 'workflow/hooks.ts: useUpdateWorkflow.onMutate patch merge 不在',
    })
  }
  // iter1442 useDeleteWorkflow invariant
  if (!src.includes('snapshot.filter((w) => w.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'workflow/hooks.ts: iter1442 useDeleteWorkflow filter invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1451 Workflow update flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateWorkflow 楽観 patch merge + iter1442 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

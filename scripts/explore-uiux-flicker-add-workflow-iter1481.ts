/**
 * Phase 6.15 loop iter1481 (mode-F = Flicker detection、Add 系):
 * useCreateWorkflow 楽観 append。
 *
 * Bug: useCreateWorkflow (src/features/workflow/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、/workflows で Workflow 作成後 ~200-500ms
 * 待ちで card が現れない flicker (useCreateSprint iter1480 と同 root cause、
 * Workflow 版)。
 *
 * 修正: temp id ('temp-' + crypto.randomUUID()) で仮 Workflow append (enabled=false
 * 初期値、graph/trigger は input default { nodes:[], edges:[] } / { kind:'manual' })。
 * fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 * iter1442 useDeleteWorkflow + iter1451 useUpdateWorkflow invariant 維持。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-workflow-iter1481.ts
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

  if (!src.includes('id: `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'workflow/hooks.ts: useCreateWorkflow temp id 不在',
    })
  }
  // iter1442 useDeleteWorkflow invariant
  if (!src.includes('snapshot.filter((w) => w.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'workflow/hooks.ts: iter1442 useDeleteWorkflow invariant 喪失',
    })
  }
  // iter1451 useUpdateWorkflow invariant
  if (!src.includes('w.id === input.id ? { ...w, ...input.patch } : w')) {
    findings.push({
      level: 'error',
      message: 'workflow/hooks.ts: iter1451 useUpdateWorkflow invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1481 CreateWorkflow flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useCreateWorkflow temp id + iter1442/1451 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

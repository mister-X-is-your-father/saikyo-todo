/**
 * Phase 6.15 loop iter1452 (mode-F = Flicker detection): useUpdateTemplate 楽観 update。
 *
 * Bug: useUpdateTemplate (src/features/template/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、Template 編集 form 保存後 ~200-500ms 待ちで
 * visible name / description / cron / variables が更新前のまま見える flicker
 * (useUpdateWorkflow iter1451 / useUpdateGoal iter1450 と同 root cause、Template 版)。
 *
 * 修正: templateKeys.list は filter (kind=manual/recurring) を含む queryKey なので
 * getQueriesData で複数 cache 横断取得、各々 id match の template を input.patch で
 * merge spread。snapshots 保存して onError rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert + iter1443 (useSoftDeleteTemplate) invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-template-update-iter1452.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/template/hooks.ts'), 'utf8')

  if (!src.includes('t.id === input.id ? { ...t, ...input.patch } : t')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useUpdateTemplate.onMutate patch merge 不在',
    })
  }
  // iter1443 useSoftDeleteTemplate invariant
  if (!src.includes('prev.filter((t) => t.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: iter1443 useSoftDeleteTemplate filter invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1452 Template update flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateTemplate 楽観 patch merge + iter1443 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

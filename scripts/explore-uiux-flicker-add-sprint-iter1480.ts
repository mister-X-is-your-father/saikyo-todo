/**
 * Phase 6.15 loop iter1480 (mode-F = Flicker detection、Add 系):
 * useCreateSprint 楽観 append。
 *
 * Bug: useCreateSprint (src/features/sprint/hooks.ts) は onSuccess invalidate のみで
 * onMutate 楽観 update を持たず、/sprints で Sprint 作成後 ~200-500ms 待ちで card が
 * 現れない flicker (useCreateGoal iter1479 と同 root cause、Sprint 版)。
 *
 * 修正: temp id ('temp-' + crypto.randomUUID()) で仮 Sprint append (status=planning
 * 初期値、createdBy 空文字)。fire-and-forget cancelQueries + snapshot rollback +
 * onSettled invalidate。iter1440/1454/1455/1459 invariant 維持。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-sprint-iter1480.ts
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

  if (!src.includes('id: `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: useCreateSprint temp id 不在',
    })
  }
  // iter1440 useChangeSprintStatus invariant
  if (!src.includes('s.id === input.id ? { ...s, status: input.status } : s')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: iter1440 useChangeSprintStatus invariant 喪失',
    })
  }
  // iter1454 useUpdateSprint invariant
  if (!src.includes('s.id === input.id ? { ...s, ...input.patch } : s')) {
    findings.push({
      level: 'error',
      message: 'sprint/hooks.ts: iter1454 useUpdateSprint invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1480 CreateSprint flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useCreateSprint temp id + iter1440/1454 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1483 (mode-F = Flicker detection、Add 系):
 * useCreateExternalSource 楽観 append。
 *
 * Bug: useCreateExternalSource (src/features/external-source/hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、/integrations で ExternalSource
 * 作成後 ~200-500ms 待ちで card が現れない flicker
 * (useCreateWorkflow iter1481 と同 root cause、ExternalSource 版)。
 *
 * 修正: temp id ('temp-' + crypto.randomUUID()) で仮 ExternalSource append (enabled=false
 * 初期値、lastPulledAt=null、createdBy 空文字)。fire-and-forget cancelQueries +
 * snapshot rollback + onSettled invalidate。iter1463 useUpdate/Delete invariant 維持。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-external-source-iter1483.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/external-source/hooks.ts'), 'utf8')

  if (!src.includes('id: `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'external-source/hooks.ts: useCreateExternalSource temp id 不在',
    })
  }
  // iter1463 useUpdate invariant
  if (!src.includes('s.id === input.id ? { ...s, ...input.patch } : s')) {
    findings.push({
      level: 'error',
      message: 'external-source/hooks.ts: iter1463 useUpdateExternalSource invariant 喪失',
    })
  }
  // iter1463 useDelete invariant
  if (!src.includes('snapshot.filter((s) => s.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'external-source/hooks.ts: iter1463 useDeleteExternalSource invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1483 CreateExternalSource flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useCreateExternalSource temp id + iter1463 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

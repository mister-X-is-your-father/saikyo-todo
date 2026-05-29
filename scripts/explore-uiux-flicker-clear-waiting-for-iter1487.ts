/**
 * Phase 6.15 loop iter1487 (mode-F = Flicker detection): useClearItemWaitingFor 楽観 update。
 *
 * Bug: useClearItemWaitingFor (src/features/item/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、連絡待ち state 解除 button click 後
 * ~200-500ms 待ちで「待ち中」 badge / chip が消えない flicker
 * (useSetItemBaseline iter1486 と同 root cause、waitingFor field 版)。
 *
 * 修正: items query 群に対して fire-and-forget cancelQueries + sync setQueryData で
 * id match の item.waitingFor を null に即セット。snapshots rollback、onSettled invalidate。
 *
 * 経路 B: source-side regex assert + iter1486 baselineMutationConfig invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-clear-waiting-for-iter1487.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/item/hooks.ts'), 'utf8')

  if (!src.includes('it.id === input.id ? { ...it, waitingFor: null } : it')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: useClearItemWaitingFor.onMutate waitingFor=null 即セット 不在',
    })
  }
  // iter1486 baselineMutationConfig invariant
  if (!src.includes('function baselineMutationConfig(workspaceId: string, set: boolean)')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter1486 baselineMutationConfig invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1487 clear waiting-for flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useClearItemWaitingFor waitingFor=null + iter1486 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

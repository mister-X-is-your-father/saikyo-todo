/**
 * Phase 6.15 loop iter1486 (mode-F = Flicker detection):
 * useSetItemBaseline + useClearItemBaseline 楽観 update。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * Gantt baseline 取得 / clear button click 後 ~200-500ms 待ちで baseline bar 描画 /
 * 消去が反映されない flicker (useArchiveItem iter1437 と同 helper パターン、
 *  baseline 版)。
 *
 * 修正: baselineMutationConfig helper で onMutate/onError/onSettled を共通化、
 * set=true なら baselineStartDate=item.startDate / baselineEndDate=item.dueDate /
 * baselineTakenAt=now にセット、set=false なら 3 field を null にクリア。
 * fire-and-forget cancelQueries + sync setQueryData + snapshot rollback + onSettled
 * invalidate。
 *
 * 経路 B: source-side regex assert + iter437/1013/1437 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-baseline-iter1486.ts
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

  if (!src.includes('function baselineMutationConfig(workspaceId: string, set: boolean)')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: baselineMutationConfig helper 不在',
    })
  }
  if (!src.includes('...baselineMutationConfig(workspaceId, true)(qc),')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: useSetItemBaseline.baselineMutationConfig(true) spread 不在',
    })
  }
  if (!src.includes('...baselineMutationConfig(workspaceId, false)(qc),')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: useClearItemBaseline.baselineMutationConfig(false) spread 不在',
    })
  }
  // iter1437 archiveMutationConfig invariant
  if (!src.includes('archiveMutationConfig(workspaceId, true)(qc)')) {
    findings.push({
      level: 'error',
      message: 'item/hooks.ts: iter1437 archiveMutationConfig invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1486 baseline flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — baselineMutationConfig helper + useSet/ClearItemBaseline spread + iter1437 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

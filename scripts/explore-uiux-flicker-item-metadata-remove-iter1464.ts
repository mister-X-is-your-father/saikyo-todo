/**
 * Phase 6.15 loop iter1464 (mode-F = Flicker detection):
 * useRemoveItemArtifact + useRemoveItemStakeholder 楽観 update。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * ItemEditDialog 内 artifact (input/output) / stakeholder (関係者) 削除後
 * ~200-500ms 待ちで row が残って見える flicker。
 * (useDeleteWorkflow iter1442 / useRemoveTemplateItem iter1462 と同 root cause、item-metadata 版)
 *
 * 修正:
 *   - useRemoveItemArtifact: id match を filter 除外
 *   - useRemoveItemStakeholder: userId match を filter 除外 (複合 key identity)
 * 両者 fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-item-metadata-remove-iter1464.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/item-metadata/hooks.ts'), 'utf8')

  if (!src.includes('snapshot.filter((a) => a.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: useRemoveItemArtifact.onMutate filter 不在',
    })
  }
  if (!src.includes('snapshot.filter((s) => s.userId !== input.userId)')) {
    findings.push({
      level: 'error',
      message: 'item-metadata/hooks.ts: useRemoveItemStakeholder.onMutate filter 不在',
    })
  }

  console.log(`\n=== Findings (iter1464 item-metadata remove flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useRemoveItemArtifact + useRemoveItemStakeholder 楽観 update OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1463 (mode-F = Flicker detection):
 * useUpdateExternalSource + useDeleteExternalSource 楽観 update。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * /integrations の External Source 編集保存 / 削除 click 後 ~200-500ms 待ちで
 * visible が更新前のままに見える flicker (useUpdateWorkflow iter1451 /
 * useDeleteWorkflow iter1442 と同 root cause、ExternalSource 版)。
 *
 * 修正:
 *   - useUpdateExternalSource: id match で patch field を merge spread
 *   - useDeleteExternalSource: id match を filter 除外
 * 両者 fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-external-source-iter1463.ts
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

  if (!src.includes('s.id === input.id ? { ...s, ...input.patch } : s')) {
    findings.push({
      level: 'error',
      message: 'external-source/hooks.ts: useUpdateExternalSource.onMutate patch merge 不在',
    })
  }
  if (!src.includes('snapshot.filter((s) => s.id !== id)')) {
    findings.push({
      level: 'error',
      message: 'external-source/hooks.ts: useDeleteExternalSource.onMutate filter 除外 不在',
    })
  }

  console.log(`\n=== Findings (iter1463 ExternalSource flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateExternalSource + useDeleteExternalSource 楽観 update OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

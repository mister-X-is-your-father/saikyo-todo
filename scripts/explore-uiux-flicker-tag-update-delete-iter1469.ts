/**
 * Phase 6.15 loop iter1469 (mode-F = Flicker detection):
 * useUpdateTag + useDeleteTag 楽観 update。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * Tag rename / 色変更 / 削除後 ~200-500ms 待ちで TagPicker / item 上 chip が
 * 残って見える flicker (useUpdateGoal iter1450 / useDeleteWorkflow iter1442 と
 * 同 root cause、Tag 版)。
 *
 * 修正:
 *   - useUpdateTag: id match で input.patch を merge spread
 *   - useDeleteTag: id match を filter 除外
 * 両者 fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-tag-update-delete-iter1469.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/tag/hooks.ts'), 'utf8')

  if (!src.includes('t.id === input.id ? { ...t, ...input.patch } : t')) {
    findings.push({
      level: 'error',
      message: 'tag/hooks.ts: useUpdateTag.onMutate patch merge 不在',
    })
  }
  if (!src.includes('snapshot.filter((t) => t.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'tag/hooks.ts: useDeleteTag.onMutate filter 不在',
    })
  }

  console.log(`\n=== Findings (iter1469 Tag update/delete flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useUpdateTag patch merge + useDeleteTag filter OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

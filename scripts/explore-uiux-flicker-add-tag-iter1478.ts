/**
 * Phase 6.15 loop iter1478 (mode-F = Flicker detection、Add 系):
 * useCreateTag 楽観 append。
 *
 * Bug: useCreateTag (src/features/tag/hooks.ts) は onSuccess invalidate のみで
 * onMutate 楽観 update を持たず、TagPicker で「+ 新規」 で新 tag 作成後 ~200-500ms
 * 待ちで tag が候補一覧に現れない flicker (useCreateSchedule iter1477 と同 root cause、
 * Tag 版)。
 *
 * 修正: temp id ('temp-' + crypto.randomUUID()) で仮 tag append、name 重複 guard 付き
 * (TagPicker で既存 tag を入力した場合の二重 append を防止)、server canonical fetch
 * (onSettled invalidate) で正規 id に上書き。
 *
 * 経路 B: source-side regex assert + iter1469 useUpdateTag / useDeleteTag invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-tag-iter1478.ts
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

  if (!src.includes('id: `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'tag/hooks.ts: useCreateTag temp id 不在',
    })
  }
  if (!src.includes('snapshot.some((t) => t.name === input.name)')) {
    findings.push({
      level: 'error',
      message: 'tag/hooks.ts: useCreateTag name 重複 guard 不在',
    })
  }
  // iter1469 useUpdateTag invariant
  if (!src.includes('t.id === input.id ? { ...t, ...input.patch } : t')) {
    findings.push({
      level: 'error',
      message: 'tag/hooks.ts: iter1469 useUpdateTag invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1478 CreateTag flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useCreateTag temp id + name guard + iter1469 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

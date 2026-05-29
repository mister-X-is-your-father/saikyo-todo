/**
 * Phase 6.15 loop iter1443 (mode-F = Flicker detection): useSoftDeleteTemplate 楽観 update。
 *
 * Bug: useSoftDeleteTemplate (src/features/template/hooks.ts) は onSuccess
 * invalidateQueries のみで onMutate 楽観 update を持たず、Template 削除 button
 * click 後 ~200-500ms 待ちで card が表示されたまま残る flicker
 * (useDeleteWorkflow iter1442 / useDeleteKeyResult iter1441 と同 root cause)。
 *
 * 修正: onMutate で templateKeys.all/workspaceId scope を fire-and-forget cancelQueries
 * + sync setQueryData。templateKeys.list は filter (kind=manual/recurring) を含む
 * queryKey なので `getQueriesData` で複数 cache 横断取得し、各々 id match で filter
 * 除外、snapshots 保存して onError rollback、onSettled で正規 invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-template-delete-iter1443.ts
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

  if (!src.includes('void qc.cancelQueries({ queryKey: [...templateKeys.all, workspaceId] })')) {
    findings.push({
      level: 'error',
      message:
        'template/hooks.ts: useSoftDeleteTemplate.onMutate fire-and-forget cancelQueries 不在',
    })
  }
  if (!src.includes('prev.filter((t) => t.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useSoftDeleteTemplate.onMutate filter 不在',
    })
  }
  if (
    !src.includes(
      'for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useSoftDeleteTemplate.onError rollback 不在',
    })
  }
  if (!src.includes('onSettled: () => {')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useSoftDeleteTemplate.onSettled 不在',
    })
  }

  console.log(`\n=== Findings (iter1443 Template delete flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useSoftDeleteTemplate 楽観 update (cancel/filter/rollback/onSettled) 4 fragment OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1462 (mode-F = Flicker detection):
 * useUpdateTemplateItem + useRemoveTemplateItem 楽観 update。
 *
 * Bug: 両 hook は onSuccess invalidate のみで onMutate 楽観 update を持たず、
 * Template の編集 dialog で TemplateItem 編集保存 / 削除 click 後 ~200-500ms 待ちで
 * visible が更新前のままに見える flicker (useUpdateTemplate iter1452 /
 * useDeleteWorkflow iter1442 と同 root cause、template item 版)。
 *
 * 修正:
 *   - useUpdateTemplateItem: id match で patch field を merge spread
 *   - useRemoveTemplateItem: id match を filter 除外
 * 両者 fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert + iter1443/1452 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-template-item-iter1462.ts
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

  // useUpdateTemplateItem patch merge
  if (!src.includes('t.id === input.id ? { ...t, ...input.patch } : t')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useUpdateTemplateItem.onMutate patch merge 不在',
    })
  }
  // useRemoveTemplateItem filter
  if (!src.includes('snapshot.filter((t) => t.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useRemoveTemplateItem.onMutate filter 除外 不在',
    })
  }
  // iter1443 useSoftDeleteTemplate invariant
  if (!src.includes('prev.filter((t) => t.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: iter1443 useSoftDeleteTemplate filter invariant 喪失',
    })
  }
  // iter1452 useUpdateTemplate invariant
  if (!src.includes('prev.map((t) => (t.id === input.id ? { ...t, ...input.patch } : t))')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: iter1452 useUpdateTemplate patch merge invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1462 TemplateItem flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useUpdateTemplateItem + useRemoveTemplateItem 楽観 update + iter1443/1452 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

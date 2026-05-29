/**
 * Phase 6.15 loop iter1476 (mode-F = Flicker detection、Add 系):
 * useAddTemplateItem 楽観 append。
 *
 * Bug: useAddTemplateItem (src/features/template/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、Template 編集 dialog で TemplateItem 追加後
 * ~200-500ms 待ちで row が現れない flicker (useAddItemArtifact iter1475 と
 * 同 root cause、TemplateItem 版)。
 *
 * 修正: temp id ('temp-' + crypto.randomUUID()) で仮 row append (input field の
 * default 反映)、server canonical fetch (onSettled invalidate) で正規 id に上書き。
 * fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert + iter1462 useUpdateTemplateItem / useRemoveTemplateItem invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-template-item-iter1476.ts
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

  if (!src.includes('id: `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useAddTemplateItem temp id 不在',
    })
  }
  if (!src.includes('[...snapshot, tempEntry]')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: useAddTemplateItem append spread 不在',
    })
  }
  // iter1462 invariants
  if (!src.includes('t.id === input.id ? { ...t, ...input.patch } : t')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: iter1462 useUpdateTemplateItem invariant 喪失',
    })
  }
  if (!src.includes('snapshot.filter((t) => t.id !== input.id)')) {
    findings.push({
      level: 'error',
      message: 'template/hooks.ts: iter1462 useRemoveTemplateItem invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1476 AddTemplateItem flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useAddTemplateItem temp id append + iter1462 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

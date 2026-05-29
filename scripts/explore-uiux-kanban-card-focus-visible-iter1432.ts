/**
 * Phase 6.15 loop iter1432 (mode-D = Desktop a11y): Kanban カードの container
 * `<div role="button" tabindex="0">` (dnd-kit useSortable inject) が、内部の
 * kanban-title button は `focus-visible:ring-ring focus-visible:ring-2 ...` 設定済
 * だが、card container 自体には focus-visible 設定無で browser default 1px auto
 * outline のみ。WCAG 2.4.7 (Focus Visible) 観点で 2px 高コントラスト ring が望ましく、
 * 大量カード列挙時の Tab 移動で「いまどこにフォーカスがあるか」 が見え難い。
 *
 * 修正: kanban-view.tsx の card container className に
 * `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none` を追加
 * (1 行内に 3 token 挿入)。
 *
 * 経路 A (MCP focus + computed style 検証) → B codify。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-kanban-card-focus-visible-iter1432.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )

  // expected: card container has focus-visible ring set
  if (
    !src.includes(
      'group focus-visible:ring-ring cursor-grab rounded border p-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing',
    )
  ) {
    findings.push({
      level: 'error',
      message:
        'kanban-view.tsx: card container に focus-visible:ring-ring + ring-2 + outline-none 不在',
    })
  }

  // invariant: kanban-title button の focus-visible (inner button) を破壊していない
  if (
    !src.includes(
      "'hover:text-primary focus-visible:ring-ring rounded text-left font-medium break-words hover:underline focus-visible:ring-2 focus-visible:outline-none '",
    )
  ) {
    findings.push({
      level: 'error',
      message: 'kanban-view.tsx: kanban-title button の focus-visible invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1432 kanban-card focus-visible) ===`)
  if (findings.length === 0)
    console.log('(なし) — card container focus-visible 2px ring + inner button invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

/**
 * Phase 6.15 loop iter1433 (mode-D = Desktop a11y): Backlog の drag cell `<td>`
 * (dnd-kit useSortable + `attributes/listeners` を drag column の `<td>` のみに
 * spread) が `role="button" tabindex="0"` でキーボード focus 可能だが、`<td>` の
 * className `px-3 py-2` に focus-visible 設定無 → browser default 1px auto outline
 * のみで focus indicator が薄い → WCAG 2.4.7 (Focus Visible)。iter1432 (Kanban
 * card focus-visible 2px ring) の同パターン水平展開。
 *
 * 修正: backlog-view.tsx の `<td>` className に
 * `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none` を追加。
 * focus-visible は実 focus 時のみ可視で、他 cell (非 focusable) には no-op。
 *
 * 経路 A (MCP focus + computed style 検証) → B codify。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-backlog-drag-cell-focus-visible-iter1433.ts
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
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  if (
    !src.includes(
      'className="focus-visible:ring-ring px-3 py-2 focus-visible:ring-2 focus-visible:outline-none"',
    )
  ) {
    findings.push({
      level: 'error',
      message:
        'backlog-view.tsx: drag cell <td> に focus-visible:ring-ring + ring-2 + outline-none 不在',
    })
  }

  // invariant: setNodeRef + attributes/listeners conditional spread を破壊していない
  if (
    !src.includes(
      "{...(cell.column.id === 'drag' && dndEnabled ? { ...attributes, ...listeners } : {})}",
    )
  ) {
    findings.push({
      level: 'error',
      message: 'backlog-view.tsx: dnd-kit conditional attributes/listeners spread invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1433 backlog drag cell focus-visible) ===`)
  if (findings.length === 0)
    console.log('(なし) — drag cell focus-visible 2px ring + conditional dnd spread invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()

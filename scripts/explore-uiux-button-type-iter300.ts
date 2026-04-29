/**
 * Phase 6.15 loop iter 300 — `<Button>` (shadcn) で `type` 属性が未指定の
 * 箇所が defensive bug の温床になる問題。
 *
 * shadcn の `<Button>` は内部 `<button>` 要素を render し、HTML5 spec で
 * `type` 未指定の `<button>` は default `type="submit"` で挙動する。
 * 現在 codebase 内で type 未指定の `<Button>` 使用例を grep した:
 *
 *   src/components/workspace/item-edit-dialog.tsx:668 (Cancel button)
 *   src/components/workspace/item-edit-dialog.tsx:671 (Save button)
 *   src/components/workspace/comment-thread.tsx:217 (Cancel button)
 *   src/components/workspace/comment-thread.tsx:220 (Save button)
 *   src/components/mock-timesheet/mock-top-nav.tsx:15, 18 (asChild → Link)
 *
 * 上記 4 件 (item-edit-dialog × 2 + comment-thread × 2) は親に form 要素が
 * 無いため現時点では submit 副作用を発生しないが、将来的に form でラップ
 * したり、無関係な親 form (例: keyboard shortcut でフォーカス移動した時
 * 等) と組み合わせた時に意図しない submit を起こす **defensive bug**。
 *
 * mock-timesheet は asChild で Link 化されているため `<a>` として render
 * され submit リスク無し、対象外。
 *
 * 期待 (fix 後):
 *   `<Button type="button" ...>` を明示。HTML5 default の submit を
 *   override して "click handler だけが効く normal button" として固定。
 *
 * codebase 内に <Button> で type 未指定 (asChild 除く) が無いことを assert。
 *
 *   pnpm tsx scripts/explore-uiux-button-type-iter300.ts
 */
import { execSync } from 'node:child_process'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // grep で <Button (without type=, without asChild) を sweep
  let result: string
  try {
    result = execSync(
      `grep -rnE "<Button " src/components --include="*.tsx" | grep -v 'type=' | grep -v '/ui/' | grep -v 'asChild' || true`,
      { encoding: 'utf8' },
    )
  } catch {
    result = ''
  }
  const lines = result.split('\n').filter((l) => l.trim().length > 0)
  findings.push({
    level: 'info',
    message: `<Button> with no type= and no asChild: ${lines.length} 件`,
  })
  if (lines.length > 0) {
    for (const l of lines.slice(0, 5)) {
      findings.push({
        level: 'warning',
        message: `type 未指定 Button 残存: ${l}`,
      })
    }
  }

  console.log(`\n=== Findings (button-type-iter300) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

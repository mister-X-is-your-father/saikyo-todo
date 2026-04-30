/**
 * Phase 6.15 loop iter 493 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * 9 view の EmptyState action raw button (`mt-2 rounded border px-3 py-1.5 text-xs`) を
 * `inline-flex min-h-11 items-center` 込み 44x44 化、codify。
 *
 * 課題: 9 view (Today / Inbox / Sprints / Goals / items-board / Integrations / Workflows /
 *   TimeEntries / Templates) の EmptyState `action` slot に raw `<button>` で同 className
 *   `text-primary hover:bg-muted mt-2 rounded border px-3 py-1.5 text-xs hover:underline` を
 *   inline 直書き。py-1.5 + text-xs ≒ 26-28px tall、mobile WCAG 2.5.5 AAA 44x44 違反。
 *
 *   各 view の最初のオンボーディング CTA (= QuickAdd / 作成フォームへ focus する経路) で
 *   user が tap しやすい必要があるが、26px tall は誤タップしやすい (特に親 EmptyState 内 code
 *   tag や inner span と密集 layout)。
 *
 * fix (9 ファイル ~9 行差分、各 file 1 行 className 置換):
 *   - 旧: `text-primary hover:bg-muted mt-2 rounded border px-3 py-1.5 text-xs hover:underline`
 *   - 新: `text-primary hover:bg-muted mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1.5 text-xs hover:underline`
 *   - inline-flex + items-center で min-h-11 (44px) 適用後も text を vertical center に保つ
 *
 * 累計 **122 button mobile target 達成** (iter460-493 で 28 fix iter、+9 件)。
 * 機能不変、shadcn 編集なし、aria-label / data-testid は全 file 維持。
 *
 * 検証: source-side regex assert で 9 file 全件確認 + 旧 className が残っていないこと。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const TARGETS = [
  'src/components/workspace/today-view.tsx',
  'src/components/workspace/inbox-view.tsx',
  'src/components/workspace/sprints-panel.tsx',
  'src/components/workspace/goals-panel.tsx',
  'src/components/workspace/items-board.tsx',
  'src/components/integrations/integrations-panel.tsx',
  'src/components/workflow/workflows-panel.tsx',
  'src/components/time-entry/time-entries-panel.tsx',
  'src/components/template/templates-panel.tsx',
]

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const path of TARGETS) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')

    // 1. 新 className が含まれている
    if (
      /text-primary hover:bg-muted mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1\.5 text-xs hover:underline/.test(
        src,
      )
    ) {
      findings.push({
        level: 'info',
        message: `${path}: 新 className (inline-flex min-h-11 items-center) 配線 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${path}: 新 className 不在`,
      })
    }

    // 2. 旧 className (min-h-11 無し) が残っていない
    if (
      !/className="text-primary hover:bg-muted mt-2 rounded border px-3 py-1\.5 text-xs hover:underline"/.test(
        src,
      )
    ) {
      findings.push({ level: 'info', message: `${path}: 旧 className が消えている OK` })
    } else {
      findings.push({ level: 'warning', message: `${path}: 旧 className が残存` })
    }
  }

  console.log(`\n=== Findings (empty-state-cta-min-h-iter493) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
